#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";

function fail(message) {
  console.error(`SwiftTip Worker provisioning failed: ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const values = {};
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--phone") {
      values.phone = argv[i + 1];
      i += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return values;
}

function normaliseSouthAfricanMobile(raw) {
  const compact = String(raw ?? "").replace(/[\s()-]/g, "");
  const normalised = compact.startsWith("0") ? `+27${compact.slice(1)}` : compact;
  if (!/^\+27[6-8][0-9]{8}$/.test(normalised)) {
    throw new Error("provide a valid South African mobile number with --phone");
  }
  return normalised;
}

async function findUserByPhone(admin, phone) {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    const match = data.users.find((user) => user.phone === phone);
    if (match) return match;
    if (data.users.length < 100) return null;
  }
  throw new Error("User lookup exceeded the safety pagination limit");
}

async function main() {
  const { phone: rawPhone } = parseArgs(process.argv);
  const phone = normaliseSouthAfricanMobile(rawPhone);

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) fail("set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) in the environment");
  if (!serviceRoleKey) fail("set SUPABASE_SERVICE_ROLE_KEY in the environment; never pass it on the command line");

  const admin = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });

  let user = await findUserByPhone(admin, phone);
  let userCreated = false;

  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      phone,
      phone_confirm: true,
      user_metadata: { swifttip_worker_bootstrap: true }
    });
    if (error || !data.user) throw error ?? new Error("Auth user was not created");
    user = data.user;
    userCreated = true;
  }

  const { data: adminMembership, error: adminMembershipError } = await admin
    .from("admin_memberships")
    .select("admin_status")
    .eq("user_id", user.id)
    .maybeSingle();
  if (adminMembershipError) throw adminMembershipError;
  if (adminMembership?.admin_status === "active") {
    if (userCreated) await admin.auth.admin.deleteUser(user.id);
    fail("this Auth identity is an active SwiftTip Admin and cannot be provisioned as a pilot Worker");
  }

  const { error: auditError } = await admin.rpc("record_worker_auth_bootstrap", {
    p_user_id: user.id,
    p_phone: phone,
    p_auth_user_created: userCreated
  });

  if (auditError) {
    if (userCreated) {
      const { error: rollbackError } = await admin.auth.admin.deleteUser(user.id);
      if (rollbackError) {
        throw new Error(`${auditError.message}. The newly created Auth identity could not be rolled back automatically: ${rollbackError.message}`);
      }
    }
    throw auditError;
  }

  console.log("SwiftTip Worker Auth identity provisioned successfully.");
  console.log(`Phone: ${phone}`);
  console.log(`Auth user created: ${userCreated}`);
  console.log("Worker record created: no");
  console.log("Worker activated: no");
  console.log("Next: the Worker signs in at /worker/login using SMS OTP, then completes normal onboarding, verification, Venue confirmation, terms and Settlement readiness.");
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)));

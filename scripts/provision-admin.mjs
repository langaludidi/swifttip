#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";

const ALLOWED_ROLES = new Set([
  "operations_admin",
  "verification_admin",
  "finance_admin",
  "security_admin",
  "super_admin"
]);

function parseArgs(argv) {
  const values = { allowUpdate: false };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--allow-update") {
      values.allowUpdate = true;
      continue;
    }
    if (arg === "--email" || arg === "--role") {
      values[arg.slice(2)] = argv[i + 1];
      i += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return values;
}

function fail(message) {
  console.error(`SwiftTip Admin provisioning failed: ${message}`);
  process.exit(1);
}

async function findUserByEmail(admin, email) {
  const target = email.toLowerCase();
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    const match = data.users.find((user) => user.email?.toLowerCase() === target);
    if (match) return match;
    if (data.users.length < 100) return null;
  }
  throw new Error("User lookup exceeded the safety pagination limit");
}

async function main() {
  const { email: rawEmail, role, allowUpdate } = parseArgs(process.argv);
  const email = String(rawEmail ?? "").trim().toLowerCase();
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) fail("provide a valid --email");
  if (!ALLOWED_ROLES.has(role)) fail(`--role must be one of: ${[...ALLOWED_ROLES].join(", ")}`);

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) fail("set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) in the environment");
  if (!serviceRoleKey) fail("set SUPABASE_SERVICE_ROLE_KEY in the environment; never pass it on the command line");

  const admin = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });

  let user = await findUserByEmail(admin, email);
  let userCreated = false;

  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { swifttip_admin_bootstrap: true }
    });
    if (error || !data.user) throw error ?? new Error("Auth user was not created");
    user = data.user;
    userCreated = true;
  }

  const { data: existingMembership, error: membershipReadError } = await admin
    .from("admin_memberships")
    .select("id,admin_role,admin_status,mfa_required")
    .eq("user_id", user.id)
    .maybeSingle();
  if (membershipReadError) throw membershipReadError;

  if (existingMembership && !allowUpdate) {
    fail(`an Admin membership already exists for ${email} (${existingMembership.admin_role}, ${existingMembership.admin_status}). Re-run with --allow-update only if this change is intentional`);
  }

  let membership;
  if (existingMembership) {
    const { data, error } = await admin
      .from("admin_memberships")
      .update({
        admin_role: role,
        admin_status: "active",
        mfa_required: true,
        revoked_at: null
      })
      .eq("id", existingMembership.id)
      .select("id,user_id,admin_role,admin_status,mfa_required")
      .single();
    if (error) throw error;
    membership = data;
  } else {
    const { data, error } = await admin
      .from("admin_memberships")
      .insert({
        user_id: user.id,
        admin_role: role,
        admin_status: "active",
        mfa_required: true,
        granted_by: null
      })
      .select("id,user_id,admin_role,admin_status,mfa_required")
      .single();
    if (error) throw error;
    membership = data;
  }

  const { error: auditError } = await admin.schema("audit").from("audit_events").insert({
    actor_type: "system",
    actor_role: "bootstrap_provisioner",
    action: existingMembership ? "admin_membership.bootstrap_updated" : "admin_membership.bootstrap_created",
    entity_type: "admin_membership",
    entity_id: membership.id,
    resulting_state: {
      user_id: membership.user_id,
      email,
      admin_role: membership.admin_role,
      admin_status: membership.admin_status,
      mfa_required: membership.mfa_required,
      auth_user_created: userCreated
    },
    reason: "Explicit one-time SwiftTip Admin provisioning command"
  });
  if (auditError) throw auditError;

  console.log("SwiftTip Admin provisioned successfully.");
  console.log(`Email: ${email}`);
  console.log(`Role: ${membership.admin_role}`);
  console.log(`MFA required: ${membership.mfa_required}`);
  console.log(`Auth user created: ${userCreated}`);
  console.log("Next: use /admin/login, complete the email OTP, then enrol/verify TOTP MFA.");
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)));

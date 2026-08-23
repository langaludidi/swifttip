#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";

function parseArgs(argv) {
  const values = {};
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (["--user-id", "--factor-id", "--email", "--reason", "--authorised-by"].includes(arg)) {
      values[arg.slice(2)] = argv[i + 1];
      i += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return values;
}

function fail(message) {
  console.error(`SwiftTip Admin MFA recovery failed: ${message}`);
  process.exit(1);
}

async function main() {
  const args = parseArgs(process.argv);
  const userId = String(args["user-id"] ?? "").trim();
  const factorId = String(args["factor-id"] ?? "").trim();
  const email = String(args.email ?? "").trim().toLowerCase();
  const reason = String(args.reason ?? "").trim();
  const authorisedBy = String(args["authorised-by"] ?? "").trim();

  if (!/^[0-9a-f-]{36}$/i.test(userId)) fail("provide the exact --user-id");
  if (factorId.length < 3) fail("provide the exact verified --factor-id");
  if (!/^\S+@\S+\.\S+$/.test(email)) fail("provide the confirmed Admin --email");
  if (reason.length < 10) fail("provide a detailed --reason (at least 10 characters)");
  if (authorisedBy.length < 3) fail("provide --authorised-by for the approving Security/Super Admin");

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) fail("set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) in the environment");
  if (!serviceRoleKey) fail("set SUPABASE_SERVICE_ROLE_KEY in the environment; never pass it on the command line");

  const admin = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });

  const { data: userData, error: userError } = await admin.auth.admin.getUserById(userId);
  if (userError || !userData.user) throw userError ?? new Error("Admin Auth user not found");
  if (userData.user.email?.toLowerCase() !== email) fail("--email does not match the supplied Auth user ID");

  const { data: membership, error: membershipError } = await admin
    .from("admin_memberships")
    .select("admin_status,mfa_required,admin_role")
    .eq("user_id", userId)
    .maybeSingle();
  if (membershipError) throw membershipError;
  if (!membership || membership.admin_status !== "active" || !membership.mfa_required) {
    fail("target must be an active Admin membership with MFA required");
  }

  const { error: deleteError } = await admin.auth.admin.mfa.deleteFactor({ id: factorId, userId });
  if (deleteError) throw deleteError;

  const { error: auditError } = await admin.rpc("record_admin_mfa_recovery_event", {
    p_admin_user_id: userId,
    p_factor_id: factorId,
    p_reason: reason,
    p_authorised_by: authorisedBy
  });
  if (auditError) {
    throw new Error(`MFA factor was deleted but the SwiftTip recovery audit event failed: ${auditError.message}`);
  }

  console.log("SwiftTip Admin MFA recovery completed.");
  console.log(`Admin: ${email}`);
  console.log(`Role: ${membership.admin_role}`);
  console.log("The recovered Admin must sign in again and enrol/verify a new TOTP factor before Operations access.");
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)));

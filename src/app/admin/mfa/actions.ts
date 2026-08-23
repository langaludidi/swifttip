"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";

type EnrollmentState = {
  error?: string;
  factorId?: string;
  qrCode?: string;
  secret?: string;
};

async function requireActiveAdminForMfa() {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/admin/login");

  const { data: membership } = await supabase
    .from("admin_memberships")
    .select("admin_status,mfa_required")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (!membership || membership.admin_status !== "active") {
    await supabase.auth.signOut();
    redirect("/admin/login?error=This%20account%20is%20not%20authorised%20for%20SwiftTip%20Operations");
  }

  return { supabase, membership };
}

export async function startAdminMfaEnrollment(_previousState: EnrollmentState, _formData: FormData): Promise<EnrollmentState> {
  const { supabase, membership } = await requireActiveAdminForMfa();
  if (!membership.mfa_required) redirect("/admin");

  const { data: existing, error: listError } = await supabase.auth.mfa.listFactors();
  if (listError) return { error: "Authenticator status could not be checked. Please try again." };

  const totpFactors = existing?.totp ?? [];
  const verified = totpFactors.find((factor) => factor.status === "verified");
  if (verified) return { error: "An authenticator is already enrolled. Enter its current code below." };

  // An interrupted enrollment can leave an unverified factor behind. Supabase only
  // requires AAL2 to remove verified factors, so stale unverified setup can be safely
  // cleared before issuing a fresh QR code.
  for (const factor of totpFactors.filter((item) => item.status !== "verified")) {
    const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
    if (unenrollError) return { error: "A previous incomplete authenticator setup could not be cleared. Sign out and try again." };
  }

  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "SwiftTip Admin" });
  if (error || !data?.totp) return { error: "Authenticator setup could not be started. Please try again." };

  return {
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret
  };
}

export async function completeAdminMfaEnrollment(formData: FormData) {
  const factorId = String(formData.get("factorId") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();
  if (!factorId || !/^\d{6}$/.test(code)) {
    redirect(`/admin/mfa?error=${encodeURIComponent("Enter the 6-digit code from your authenticator app")}`);
  }

  const { supabase } = await requireActiveAdminForMfa();
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
  if (error) redirect(`/admin/mfa?error=${encodeURIComponent("That authenticator code could not be verified")}`);
  redirect("/admin");
}

export async function verifyAdminMfa(formData: FormData) {
  const factorId = String(formData.get("factorId") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();
  if (!factorId || !/^\d{6}$/.test(code)) {
    redirect(`/admin/mfa?error=${encodeURIComponent("Enter the current 6-digit authenticator code")}`);
  }

  const { supabase } = await requireActiveAdminForMfa();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const verified = factors?.totp?.find((factor) => factor.id === factorId && factor.status === "verified");
  if (!verified) redirect(`/admin/mfa?error=${encodeURIComponent("The selected authenticator is not available")}`);

  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
  if (error) redirect(`/admin/mfa?error=${encodeURIComponent("That authenticator code is invalid or expired")}`);
  redirect("/admin");
}

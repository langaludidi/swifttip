"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { admitAuthAttempt, authRetryMessage } from "@/lib/auth-security";

const emailSchema = z.string().trim().email("Enter a valid email address").max(254);
const adminCallbackUrl = "https://swifttip.vercel.app/auth/callback";

export async function requestAdminOtp(formData: FormData) {
  const parsed = emailSchema.safeParse(String(formData.get("email") ?? ""));
  if (!parsed.success) redirect(`/admin/login?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid email")}`);

  const email = parsed.data.toLowerCase();
  const admission = await admitAuthAttempt("admin_otp_request", email);
  if (admission.allowed) {
    const supabase = await createSupabaseServerClient();
    // Keep unknown, inactive and authorised Admin identities indistinguishable here.
    await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: adminCallbackUrl,
      },
    });
  }

  const notice = admission.allowed
    ? "If this email is authorised for SwiftTip Operations, a one-time sign-in link has been sent."
    : `A code was requested recently. ${authRetryMessage(admission.retryAfterSeconds)}`;
  redirect(`/admin/login/verify?email=${encodeURIComponent(email)}&notice=${encodeURIComponent(notice)}`);
}

export async function verifyAdminOtp(formData: FormData) {
  const emailParsed = emailSchema.safeParse(String(formData.get("email") ?? ""));
  const token = String(formData.get("token") ?? "").trim();
  if (!emailParsed.success) redirect("/admin/login?error=Check%20your%20email%20and%20try%20again");
  const email = emailParsed.data.toLowerCase();
  if (!/^\d{6,8}$/.test(token)) {
    redirect(`/admin/login/verify?email=${encodeURIComponent(email)}&error=${encodeURIComponent("Enter the code from your email")}`);
  }

  const admission = await admitAuthAttempt("admin_otp_verify", email);
  if (!admission.allowed) {
    redirect(`/admin/login/verify?email=${encodeURIComponent(email)}&error=${encodeURIComponent(`The code could not be verified. ${authRetryMessage(admission.retryAfterSeconds)}`)}`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error) {
    redirect(`/admin/login/verify?email=${encodeURIComponent(email)}&error=${encodeURIComponent("The code could not be verified. Check it and try again.")}`);
  }

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/admin/login?error=Sign-in%20could%20not%20be%20verified");

  const { data: membership } = await supabase
    .from("admin_memberships")
    .select("admin_status,mfa_required")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (!membership || membership.admin_status !== "active") {
    await supabase.auth.signOut();
    redirect("/admin/login?error=SwiftTip%20Operations%20access%20is%20unavailable%20for%20this%20account");
  }

  if (membership.mfa_required) redirect("/admin/mfa");
  redirect("/admin");
}

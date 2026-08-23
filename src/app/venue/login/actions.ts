"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { admitAuthAttempt, authRetryMessage } from "@/lib/auth-security";

const emailSchema = z.string().trim().email("Enter a valid email address").max(254);

export async function requestVenueOtp(formData: FormData) {
  const parsed = emailSchema.safeParse(String(formData.get("email") ?? ""));
  if (!parsed.success) redirect(`/venue/login?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid email")}`);
  const email = parsed.data.toLowerCase();
  const admission = await admitAuthAttempt("venue_otp_request", email);

  if (admission.allowed) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
  }

  const notice = admission.allowed
    ? "If this email can receive SwiftTip Venue access, a one-time code has been sent."
    : `A code was requested recently. ${authRetryMessage(admission.retryAfterSeconds)}`;
  redirect(`/venue/login/verify?email=${encodeURIComponent(email)}&notice=${encodeURIComponent(notice)}`);
}

export async function verifyVenueOtp(formData: FormData) {
  const emailParsed = emailSchema.safeParse(String(formData.get("email") ?? ""));
  const token = String(formData.get("token") ?? "").trim();
  if (!emailParsed.success) redirect("/venue/login?error=Check%20your%20email%20and%20try%20again");
  const email = emailParsed.data.toLowerCase();
  if (!/^\d{6,8}$/.test(token)) redirect(`/venue/login/verify?email=${encodeURIComponent(email)}&error=${encodeURIComponent("Enter the code from your email")}`);

  const admission = await admitAuthAttempt("venue_otp_verify", email);
  if (!admission.allowed) {
    redirect(`/venue/login/verify?email=${encodeURIComponent(email)}&error=${encodeURIComponent(`The code could not be verified. ${authRetryMessage(admission.retryAfterSeconds)}`)}`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error) redirect(`/venue/login/verify?email=${encodeURIComponent(email)}&error=${encodeURIComponent("The code could not be verified. Check it and try again.")}`);
  redirect("/venue/onboarding");
}

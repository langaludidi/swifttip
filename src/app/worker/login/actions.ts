"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { admitAuthAttempt, authRetryMessage } from "@/lib/auth-security";

const phoneSchema = z.string().trim().regex(/^(?:\+27|0)[6-8][0-9]{8}$/, "Enter a valid South African mobile number");

function normaliseSouthAfricanMobile(value: string) {
  const compact = value.replace(/\s+/g, "");
  return compact.startsWith("0") ? `+27${compact.slice(1)}` : compact;
}

export async function requestWorkerOtp(formData: FormData) {
  const raw = String(formData.get("phone") ?? "");
  const parsed = phoneSchema.safeParse(raw.replace(/\s+/g, ""));
  if (!parsed.success) redirect(`/worker/login?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid mobile number")}`);

  const phone = normaliseSouthAfricanMobile(parsed.data);
  const admission = await admitAuthAttempt("worker_otp_request", phone);

  if (admission.allowed) {
    const supabase = await createSupabaseServerClient();
    // Deliberately ignore identity-specific Auth errors here. The next screen is the
    // same whether the pre-authorised Worker identity exists or not.
    await supabase.auth.signInWithOtp({ phone, options: { shouldCreateUser: false } });
  }

  const notice = admission.allowed
    ? "If this mobile number is eligible for SwiftTip Worker access, a one-time code has been sent."
    : `A code was requested recently. ${authRetryMessage(admission.retryAfterSeconds)}`;
  redirect(`/worker/login/verify?phone=${encodeURIComponent(phone)}&notice=${encodeURIComponent(notice)}`);
}

export async function verifyWorkerOtp(formData: FormData) {
  const phoneRaw = String(formData.get("phone") ?? "");
  const phoneParsed = phoneSchema.safeParse(phoneRaw.replace(/\s+/g, ""));
  const token = String(formData.get("token") ?? "").trim();
  if (!phoneParsed.success) redirect("/worker/login?error=Check%20your%20mobile%20number%20and%20try%20again");
  const phone = normaliseSouthAfricanMobile(phoneParsed.data);
  if (!/^\d{6}$/.test(token)) redirect(`/worker/login/verify?phone=${encodeURIComponent(phone)}&error=${encodeURIComponent("Enter the 6-digit code")}`);

  const admission = await admitAuthAttempt("worker_otp_verify", phone);
  if (!admission.allowed) {
    redirect(`/worker/login/verify?phone=${encodeURIComponent(phone)}&error=${encodeURIComponent(`The code could not be verified. ${authRetryMessage(admission.retryAfterSeconds)}`)}`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({ phone, token, type: "sms" });
  if (error) redirect(`/worker/login/verify?phone=${encodeURIComponent(phone)}&error=${encodeURIComponent("The code could not be verified. Check it and try again.")}`);
  redirect("/worker");
}

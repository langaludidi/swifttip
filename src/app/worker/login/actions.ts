"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";

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
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({ phone, options: { shouldCreateUser: false } });
  if (error) redirect(`/worker/login?error=${encodeURIComponent("We couldn't send the secure code. Please try again.")}`);
  redirect(`/worker/login/verify?phone=${encodeURIComponent(phone)}`);
}

export async function verifyWorkerOtp(formData: FormData) {
  const phone = String(formData.get("phone") ?? "");
  const token = String(formData.get("token") ?? "").trim();
  if (!/^\d{6}$/.test(token)) redirect(`/worker/login/verify?phone=${encodeURIComponent(phone)}&error=${encodeURIComponent("Enter the 6-digit code")}`);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({ phone, token, type: "sms" });
  if (error) redirect(`/worker/login/verify?phone=${encodeURIComponent(phone)}&error=${encodeURIComponent("The code is invalid or expired")}`);
  redirect("/worker");
}

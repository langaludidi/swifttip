"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";

const emailSchema = z.string().trim().email("Enter a valid email address").max(254);

export async function requestVenueOtp(formData: FormData) {
  const parsed = emailSchema.safeParse(String(formData.get("email") ?? ""));
  if (!parsed.success) redirect(`/venue/login?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid email")}`);
  const email = parsed.data.toLowerCase();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
  if (error) redirect(`/venue/login?error=${encodeURIComponent("We couldn't send the secure code. Please try again.")}`);
  redirect(`/venue/login/verify?email=${encodeURIComponent(email)}`);
}

export async function verifyVenueOtp(formData: FormData) {
  const emailParsed = emailSchema.safeParse(String(formData.get("email") ?? ""));
  const token = String(formData.get("token") ?? "").trim();
  if (!emailParsed.success) redirect("/venue/login?error=Invalid%20email");
  if (!/^\d{6,8}$/.test(token)) redirect(`/venue/login/verify?email=${encodeURIComponent(emailParsed.data)}&error=${encodeURIComponent("Enter the code from your email")}`);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({ email: emailParsed.data.toLowerCase(), token, type: "email" });
  if (error) redirect(`/venue/login/verify?email=${encodeURIComponent(emailParsed.data)}&error=${encodeURIComponent("The code is invalid or expired")}`);
  redirect("/venue/onboarding");
}

"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";

const emailSchema = z.string().trim().email("Enter a valid email address").max(254);

export async function requestAdminOtp(formData: FormData) {
  const parsed = emailSchema.safeParse(String(formData.get("email") ?? ""));
  if (!parsed.success) redirect(`/admin/login?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid email")}`);

  const email = parsed.data.toLowerCase();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false }
  });

  if (error) {
    // Keep the response generic so this endpoint does not become an Admin-account enumerator.
    redirect(`/admin/login?error=${encodeURIComponent("We couldn't send a sign-in code. Check your authorised Admin account and try again.")}`);
  }

  redirect(`/admin/login/verify?email=${encodeURIComponent(email)}`);
}

export async function verifyAdminOtp(formData: FormData) {
  const emailParsed = emailSchema.safeParse(String(formData.get("email") ?? ""));
  const token = String(formData.get("token") ?? "").trim();
  if (!emailParsed.success) redirect("/admin/login?error=Invalid%20email");
  if (!/^\d{6,8}$/.test(token)) {
    redirect(`/admin/login/verify?email=${encodeURIComponent(emailParsed.data)}&error=${encodeURIComponent("Enter the code from your email")}`);
  }

  const supabase = await createSupabaseServerClient();
  const email = emailParsed.data.toLowerCase();
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error) {
    redirect(`/admin/login/verify?email=${encodeURIComponent(email)}&error=${encodeURIComponent("The code is invalid or expired")}`);
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
    redirect("/admin/login?error=This%20account%20is%20not%20authorised%20for%20SwiftTip%20Operations");
  }

  if (membership.mfa_required) redirect("/admin/mfa");
  redirect("/admin");
}

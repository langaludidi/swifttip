"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";

const idSchema = z.string().uuid();

export async function acceptVenueTerms(formData: FormData) {
  const parsed = idSchema.safeParse(String(formData.get("membershipId") ?? ""));
  if (!parsed.success) redirect("/venue/onboarding?error=Invalid%20invitation");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("accept_current_venue_terms", { p_membership_id: parsed.data, p_acceptance_method: "explicit_button" });
  if (error) redirect(`/venue/onboarding?error=${encodeURIComponent(error.message)}`);
  redirect("/venue/onboarding?terms=accepted");
}

export async function acceptVenueInvitation(formData: FormData) {
  const parsed = idSchema.safeParse(String(formData.get("membershipId") ?? ""));
  if (!parsed.success) redirect("/venue/onboarding?error=Invalid%20invitation");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("accept_venue_membership", { p_membership_id: parsed.data });
  if (error) redirect(`/venue/onboarding?error=${encodeURIComponent(error.message)}`);
  redirect("/venue");
}

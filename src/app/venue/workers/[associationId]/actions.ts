"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";

const uuidSchema = z.string().uuid();

export async function confirmAssociation(formData: FormData) {
  const associationId = uuidSchema.parse(String(formData.get("associationId") ?? ""));
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("decide_worker_venue_association", { p_association_id: associationId, p_decision: "confirm", p_reason: null });
  if (error) redirect(`/venue/workers/${associationId}?error=${encodeURIComponent("The Worker could not be confirmed.")}`);
  redirect(`/venue/workers/${associationId}?updated=confirmed`);
}

export async function rejectAssociation(formData: FormData) {
  const associationId = uuidSchema.parse(String(formData.get("associationId") ?? ""));
  const reason = String(formData.get("reason") ?? "").trim();
  if (reason.length < 3) redirect(`/venue/workers/${associationId}?error=${encodeURIComponent("Give a short reason for declining the association.")}`);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("decide_worker_venue_association", { p_association_id: associationId, p_decision: "reject", p_reason: reason });
  if (error) redirect(`/venue/workers/${associationId}?error=${encodeURIComponent("The association could not be declined.")}`);
  redirect("/venue");
}

export async function endAssociation(formData: FormData) {
  const associationId = uuidSchema.parse(String(formData.get("associationId") ?? ""));
  const reason = String(formData.get("reason") ?? "").trim();
  if (reason.length < 3) redirect(`/venue/workers/${associationId}?error=${encodeURIComponent("Give a short reason for ending the Venue association.")}`);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("end_worker_venue_association", { p_association_id: associationId, p_reason: reason });
  if (error) redirect(`/venue/workers/${associationId}?error=${encodeURIComponent("The Venue association could not be ended.")}`);
  redirect("/venue");
}

"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";

const uuid = z.string().uuid();
const nameSchema = z.string().trim().min(3).max(160);

function toIso(value: FormDataEntryValue | null): string | undefined {
  const raw = String(value ?? "").trim();
  if (!raw) return undefined;
  const d = new Date(`${raw}T00:00:00+02:00`);
  return Number.isFinite(d.getTime()) ? d.toISOString() : undefined;
}

export async function createDraftPilot(formData: FormData) {
  const name = nameSchema.safeParse(String(formData.get("name") ?? ""));
  const pricing = uuid.safeParse(String(formData.get("pricingVersionId") ?? ""));
  if (!name.success || !pricing.success) redirect("/admin/pilot/setup?error=Invalid%20pilot%20details");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_create_draft_pilot", {
    p_name: name.data,
    p_cohort_type: String(formData.get("cohortType") ?? "dual_archetype").trim() || "dual_archetype",
    p_pricing_version_id: pricing.data,
    p_start_at: toIso(formData.get("startAt")),
    p_end_at: toIso(formData.get("endAt"))
  });
  if (error) redirect(`/admin/pilot/setup?error=${encodeURIComponent(error.message)}`);
  redirect("/admin/pilot/setup?created=1");
}

export async function addPilotVenue(formData: FormData) {
  const cohort = uuid.safeParse(String(formData.get("cohortId") ?? ""));
  const venue = uuid.safeParse(String(formData.get("venueId") ?? ""));
  if (!cohort.success || !venue.success) redirect("/admin/pilot/setup?error=Invalid%20pilot%20or%20Venue");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_add_pilot_venue", { p_pilot_cohort_id: cohort.data, p_venue_id: venue.data });
  if (error) redirect(`/admin/pilot/setup?error=${encodeURIComponent(error.message)}`);
  redirect("/admin/pilot/setup?venue=added");
}

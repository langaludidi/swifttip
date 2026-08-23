"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";

const nameSchema = z.string().trim().min(1).max(100);
const roleSchema = z.string().trim().min(1, "Enter your role at the Venue").max(100);
const uuidSchema = z.string().uuid();

function fail(message: string): never {
  redirect(`/worker/onboarding?error=${encodeURIComponent(message)}`);
}

export async function startWorkerProfile(formData: FormData) {
  const first = nameSchema.safeParse(String(formData.get("legalFirstName") ?? ""));
  const last = nameSchema.safeParse(String(formData.get("legalLastName") ?? ""));
  const display = nameSchema.safeParse(String(formData.get("displayFirstName") ?? ""));
  if (!first.success || !last.success || !display.success) fail("Enter your legal name and the first name customers should see.");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("start_worker_onboarding", {
    p_legal_first_name: first.data,
    p_legal_last_name: last.data,
    p_display_first_name: display.data
  });
  if (error) fail("We could not start your Worker profile. Please try again.");
  redirect("/worker/onboarding?started=1");
}

export async function requestVenueAssociation(formData: FormData) {
  const venueId = uuidSchema.safeParse(String(formData.get("venueId") ?? ""));
  const workerRole = roleSchema.safeParse(String(formData.get("workerRole") ?? ""));
  if (!venueId.success) fail("Choose a valid Venue.");
  if (!workerRole.success) fail(workerRole.error.issues[0]?.message ?? "Enter your role at the Venue.");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("request_worker_venue_association", {
    p_venue_id: venueId.data,
    p_worker_role: workerRole.data
  });
  if (error) fail(error.message.includes("already pending") ? "A Venue confirmation request is already pending." : "We could not send the Venue confirmation request.");
  redirect("/worker/onboarding?venueRequested=1");
}

export async function acceptWorkerTerms() {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("accept_current_worker_terms", { p_acceptance_method: "explicit_button" });
  if (error) fail(error.message.includes("not yet published") ? "Worker terms are not yet published." : "We could not record your terms acceptance.");
  redirect("/worker/onboarding?termsAccepted=1");
}

export async function activateWorkerAccount() {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("activate_current_worker");
  if (error) fail("Your account cannot be activated until every required check is complete.");
  redirect("/worker?activated=1");
}

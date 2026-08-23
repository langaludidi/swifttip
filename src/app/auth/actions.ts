"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";

async function endSession(destination: string) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect(destination);
}

export async function signOutWorker() {
  await endSession("/worker/login");
}

export async function signOutVenue() {
  await endSession("/venue/login");
}

export async function signOutAdmin() {
  await endSession("/admin/login");
}

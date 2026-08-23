"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";

const venueName = z.string().trim().min(2).max(160);
const venueType = z.enum(["fuel_station", "car_wash", "valet", "hotel", "restaurant", "other"]);
const venueRole = z.enum(["venue_admin", "venue_viewer"]);
const email = z.string().trim().email().max(254);
const uuid = z.string().uuid();

export async function createVenue(formData: FormData) {
  const name = venueName.safeParse(String(formData.get("tradingName") ?? ""));
  const type = venueType.safeParse(String(formData.get("venueType") ?? ""));
  if (!name.success || !type.success) redirect("/admin/venues?error=Invalid%20Venue%20details");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_create_venue", {
    p_trading_name: name.data,
    p_branch_name: String(formData.get("branchName") ?? "").trim() || null,
    p_venue_type: type.data,
    p_city: String(formData.get("city") ?? "").trim() || null,
    p_province: String(formData.get("province") ?? "").trim() || null,
    p_public_location_label: String(formData.get("locationLabel") ?? "").trim() || null
  });

  if (error) redirect(`/admin/venues?error=${encodeURIComponent(error.message)}`);
  redirect("/admin/venues?created=1");
}

export async function approveVenue(formData: FormData) {
  const id = uuid.safeParse(String(formData.get("venueId") ?? ""));
  if (!id.success) redirect("/admin/venues?error=Invalid%20Venue");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_approve_venue", { p_venue_id: id.data });
  if (error) redirect(`/admin/venues?error=${encodeURIComponent(error.message)}`);
  redirect("/admin/venues?approved=1");
}

export async function inviteVenueMember(formData: FormData) {
  const venueId = uuid.safeParse(String(formData.get("venueId") ?? ""));
  const memberEmail = email.safeParse(String(formData.get("email") ?? ""));
  const role = venueRole.safeParse(String(formData.get("role") ?? "venue_admin"));

  if (!venueId.success || !memberEmail.success || !role.success) {
    redirect("/admin/venues?error=Enter%20a%20valid%20Venue%20member%20email%20and%20role");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_invite_venue_member_by_email", {
    p_venue_id: venueId.data,
    p_email: memberEmail.data.toLowerCase(),
    p_role: role.data
  });

  if (error) redirect(`/admin/venues?error=${encodeURIComponent(error.message)}`);
  redirect(`/admin/venues?invited=${encodeURIComponent(memberEmail.data.toLowerCase())}`);
}

import { redirect } from "next/navigation";
import { getServerConfig } from "@/lib/config";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";

export type SurfaceAccess = { mode: "demo"; userId: null } | { mode: "live"; userId: string };

async function getAuthenticatedUser() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { supabase, user: null };
  return { supabase, user: data.user };
}

export async function requireWorkerSurface(): Promise<SurfaceAccess> {
  const config = getServerConfig();
  if (config.demoMode) return { mode: "demo", userId: null };
  if (!config.databaseConfigured) redirect("/unavailable");

  const { supabase, user } = await getAuthenticatedUser();
  if (!user) redirect("/worker/login");
  const { data: worker, error } = await supabase.from("workers").select("id, worker_status").eq("user_id", user.id).maybeSingle();
  if (error || !worker) redirect("/worker/onboarding");
  return { mode: "live", userId: user.id };
}

export async function requireVenueSurface(): Promise<SurfaceAccess> {
  const config = getServerConfig();
  if (config.demoMode) return { mode: "demo", userId: null };
  if (!config.databaseConfigured) redirect("/unavailable");

  const { supabase, user } = await getAuthenticatedUser();
  if (!user) redirect("/unavailable");
  const { data: memberships, error } = await supabase.from("venue_memberships").select("id").eq("user_id", user.id).eq("membership_status", "active").limit(1);
  if (error || !memberships?.length) redirect("/unavailable");
  return { mode: "live", userId: user.id };
}

export async function requireAdminSurface(): Promise<SurfaceAccess> {
  const config = getServerConfig();
  if (config.demoMode) return { mode: "demo", userId: null };
  if (!config.databaseConfigured) redirect("/unavailable");

  const { supabase, user } = await getAuthenticatedUser();
  if (!user) redirect("/unavailable");
  const { data: admin, error } = await supabase.from("admin_memberships").select("admin_role, admin_status, mfa_required").eq("user_id", user.id).maybeSingle();
  if (error || !admin || admin.admin_status !== "active") redirect("/unavailable");

  if (admin.mfa_required) {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.currentLevel !== "aal2") redirect("/unavailable?reason=mfa_required");
  }
  return { mode: "live", userId: user.id };
}

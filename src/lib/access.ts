import { redirect } from "next/navigation";
import { getServerConfig } from "@/lib/config";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";

export type SurfaceAccess = { mode: "demo"; userId: null } | { mode: "live"; userId: string };
export type AdminRole = "operations_admin" | "verification_admin" | "finance_admin" | "security_admin" | "super_admin";
export type AdminSurfaceAccess = { mode: "demo"; userId: null; role: "super_admin" } | { mode: "live"; userId: string; role: AdminRole };

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
  if (!user) redirect("/venue/login");
  const { data: memberships, error } = await supabase.from("venue_memberships").select("id,membership_status").eq("user_id", user.id).limit(10);
  if (error) redirect("/unavailable");
  if (!memberships?.some((membership) => membership.membership_status === "active")) redirect("/venue/onboarding");
  return { mode: "live", userId: user.id };
}

export async function requireAdminSurface(): Promise<AdminSurfaceAccess> {
  const config = getServerConfig();
  if (config.demoMode) return { mode: "demo", userId: null, role: "super_admin" };
  if (!config.databaseConfigured) redirect("/unavailable");

  const { supabase, user } = await getAuthenticatedUser();
  if (!user) redirect("/unavailable");
  const { data: admin, error } = await supabase.from("admin_memberships").select("admin_role, admin_status, mfa_required").eq("user_id", user.id).maybeSingle();
  if (error || !admin || admin.admin_status !== "active") redirect("/unavailable");

  if (admin.mfa_required) {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.currentLevel !== "aal2") redirect("/unavailable?reason=mfa_required");
  }
  return { mode: "live", userId: user.id, role: admin.admin_role as AdminRole };
}

export async function requireAdminRole(allowedRoles: AdminRole[]): Promise<AdminSurfaceAccess> {
  const access = await requireAdminSurface();
  if (access.mode === "live" && !allowedRoles.includes(access.role)) redirect("/unavailable");
  return access;
}

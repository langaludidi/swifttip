import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getServerConfig } from "@/lib/config";
import type { Database } from "@/types/database";

export function createSupabaseAdminClient() {
  const config = getServerConfig();
  const url = config.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = config.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error("Supabase service-role access is not configured");

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
}

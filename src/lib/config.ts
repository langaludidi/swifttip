import { z } from "zod";

const explicitEnvSchema = z.enum(["development", "staging", "production"]);
const serverSchema = z.object({
  PAYMENTS_ENABLED: z.enum(["true", "false"]).default("false"),
  PAYMENT_PROVIDER: z.string().default("unconfigured"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional().or(z.literal("")),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SWIFTTIP_ENV: z.string().optional(),
  VERCEL_ENV: z.string().optional()
});

// Supabase publishable credentials are intentionally client-public. These constants are
// a staging-only fallback so the greenfield preview can connect even when Vercel Preview
// variables are unavailable. Production never falls back to them.
const STAGING_SUPABASE_URL = "https://bxtfcfuehqljedxwykfk.supabase.co";
const STAGING_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_XUOsufGnO385-mEJ763vGQ_f9MUHfHU";

export type SwiftTipEnvironment = "development" | "staging" | "production";
export type SupabaseConfigSource = "environment" | "staging_fallback" | "none";

function inferEnvironment(values: z.infer<typeof serverSchema>): SwiftTipEnvironment {
  const explicit = explicitEnvSchema.safeParse(values.SWIFTTIP_ENV);
  if (explicit.success) return explicit.data;
  if (values.VERCEL_ENV === "production") return "production";
  if (values.VERCEL_ENV === "preview") return "staging";
  return "development";
}

export function getServerConfig() {
  const parsed = serverSchema.parse(process.env);
  const environment = inferEnvironment(parsed);
  const hasEnvironmentDatabaseConfig = Boolean(parsed.NEXT_PUBLIC_SUPABASE_URL && parsed.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  const useStagingFallback = environment === "staging" && !hasEnvironmentDatabaseConfig;

  const resolvedSupabaseUrl = hasEnvironmentDatabaseConfig
    ? parsed.NEXT_PUBLIC_SUPABASE_URL
    : useStagingFallback
      ? STAGING_SUPABASE_URL
      : undefined;
  const resolvedSupabasePublishableKey = hasEnvironmentDatabaseConfig
    ? parsed.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    : useStagingFallback
      ? STAGING_SUPABASE_PUBLISHABLE_KEY
      : undefined;

  const databaseConfigured = Boolean(resolvedSupabaseUrl && resolvedSupabasePublishableKey);
  const supabaseConfigSource: SupabaseConfigSource = hasEnvironmentDatabaseConfig
    ? "environment"
    : useStagingFallback
      ? "staging_fallback"
      : "none";

  return {
    ...parsed,
    NEXT_PUBLIC_SUPABASE_URL: resolvedSupabaseUrl,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: resolvedSupabasePublishableKey,
    environment,
    SWIFTTIP_ENV: environment,
    paymentsEnabled: parsed.PAYMENTS_ENABLED === "true",
    databaseConfigured,
    demoMode: environment !== "production" && !databaseConfigured,
    supabaseConfigSource
  };
}

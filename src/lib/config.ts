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

export type SwiftTipEnvironment = "development" | "staging" | "production";
export type SupabaseConfigSource = "environment" | "none";

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
  const databaseConfigured = Boolean(parsed.NEXT_PUBLIC_SUPABASE_URL && parsed.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  const supabaseConfigSource: SupabaseConfigSource = databaseConfigured ? "environment" : "none";

  return {
    ...parsed,
    NEXT_PUBLIC_SUPABASE_URL: parsed.NEXT_PUBLIC_SUPABASE_URL || undefined,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: parsed.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || undefined,
    environment,
    SWIFTTIP_ENV: environment,
    paymentsEnabled: parsed.PAYMENTS_ENABLED === "true",
    databaseConfigured,
    demoMode: environment !== "production" && !databaseConfigured,
    supabaseConfigSource
  };
}

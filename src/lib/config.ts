import { z } from "zod";

const serverSchema = z.object({
  SWIFTTIP_ENV: z.enum(["development", "staging", "production"]).default("development"),
  PAYMENTS_ENABLED: z.enum(["true", "false"]).default("false"),
  PAYMENT_PROVIDER: z.string().default("unconfigured"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional().or(z.literal("")),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional()
});
export function getServerConfig() {
  const parsed = serverSchema.parse(process.env);
  return { ...parsed, paymentsEnabled: parsed.PAYMENTS_ENABLED === "true" };
}

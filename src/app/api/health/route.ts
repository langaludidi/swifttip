import { NextResponse } from "next/server";
import { getServerConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = getServerConfig();
  const providerConfigured = config.PAYMENT_PROVIDER !== "unconfigured";
  const liveMoneyReady = config.databaseConfigured && providerConfigured && config.paymentsEnabled;

  return NextResponse.json({
    ok: true,
    service: "swifttip-v3",
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? "local",
    environment: config.environment,
    hasSupabaseUrl: Boolean(config.NEXT_PUBLIC_SUPABASE_URL),
    hasSupabasePublishableKey: Boolean(config.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
    databaseConfigured: config.databaseConfigured,
    paymentProviderConfigured: providerConfigured,
    paymentsEnabled: config.paymentsEnabled,
    liveMoneyReady
  }, { headers: { "Cache-Control": "no-store" } });
}

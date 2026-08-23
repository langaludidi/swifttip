import { NextResponse } from "next/server";
import { getServerConfig } from "@/lib/config";

export async function GET() {
  const config = getServerConfig();
  return NextResponse.json({
    service: "swifttip-v3",
    status: "ok",
    environment: config.SWIFTTIP_ENV,
    databaseConfigured: Boolean(config.NEXT_PUBLIC_SUPABASE_URL && config.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
    paymentProviderConfigured: config.PAYMENT_PROVIDER !== "unconfigured",
    paymentsEnabled: config.paymentsEnabled
  });
}

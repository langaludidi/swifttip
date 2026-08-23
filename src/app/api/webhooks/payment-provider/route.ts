import { NextResponse } from "next/server";
import { getServerConfig } from "@/lib/config";

export async function POST() {
  const config = getServerConfig();
  if (config.PAYMENT_PROVIDER === "unconfigured") {
    return NextResponse.json({ error: { code: "WEBHOOK_PROVIDER_NOT_CONFIGURED", message: "No payment provider webhook is configured." } }, { status: 503 });
  }
  return NextResponse.json({ error: { code: "WEBHOOK_VERIFICATION_NOT_IMPLEMENTED", message: "Webhook verification is not yet implemented for the selected provider." } }, { status: 501 });
}

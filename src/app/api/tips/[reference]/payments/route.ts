import { NextResponse } from "next/server";
import { getServerConfig } from "@/lib/config";

export async function POST(_: Request, { params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  const config = getServerConfig();
  if (!config.paymentsEnabled) return NextResponse.json({ error: { code: "PAYMENTS_DISABLED", message: "SwiftTip live payments are intentionally disabled.", reference } }, { status: 503 });
  if (config.PAYMENT_PROVIDER === "unconfigured") return NextResponse.json({ error: { code: "PAYMENT_PROVIDER_NOT_CONFIGURED", message: "The approved payment provider has not been configured." } }, { status: 503 });
  return NextResponse.json({ error: { code: "PROVIDER_ADAPTER_PENDING", message: "Provider adapter implementation is pending provider selection." } }, { status: 501 });
}

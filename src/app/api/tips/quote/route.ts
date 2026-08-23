import { NextResponse } from "next/server";
import { tipQuoteRequestSchema } from "@/lib/contracts";
import { calculateTipPricing } from "@/lib/money";
import { getServerConfig } from "@/lib/config";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";

export async function POST(request: Request) {
  const config = getServerConfig();
  try {
    const body = tipQuoteRequestSchema.parse(await request.json());
    if (config.NEXT_PUBLIC_SUPABASE_URL && config.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
      const supabase = await createSupabaseServerClient();
      const { data, error } = await supabase.rpc("quote_tip", { p_public_token: body.endpointToken, p_gross_gratuity_cents: body.grossGratuityCents });
      if (error || !data?.length) return NextResponse.json({ error: { code: "WORKER_UNAVAILABLE", message: "This SwiftTip profile is currently unavailable." } }, { status: 400 });
      return NextResponse.json({ quote: data[0] });
    }
    if (config.SWIFTTIP_ENV === "production") return NextResponse.json({ error: { code: "DATABASE_NOT_CONFIGURED", message: "SwiftTip is temporarily unavailable." } }, { status: 503 });
    if (body.endpointToken !== "T4K8P") return NextResponse.json({ error: { code: "WORKER_UNAVAILABLE", message: "This SwiftTip profile is currently unavailable." } }, { status: 404 });
    return NextResponse.json({ demo: true, pricing: calculateTipPricing(body.grossGratuityCents), currency: "ZAR", pricingVersion: "working-v3-hypothesis" });
  } catch {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Check the tip amount and try again." } }, { status: 400 });
  }
}

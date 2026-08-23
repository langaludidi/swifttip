import { NextResponse } from "next/server";
import { tipQuoteRequestSchema } from "@/lib/contracts";
import { calculateTipPricing } from "@/lib/money";
import { getServerConfig } from "@/lib/config";
import {
  HttpRequestError,
  classifySupabaseFailure,
  readJsonBody,
  retryAfterHeaders
} from "@/lib/http-resilience";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";

function unavailable() {
  return NextResponse.json(
    { error: { code: "SERVICE_UNAVAILABLE", message: "SwiftTip is temporarily unavailable. Please try again." } },
    { status: 503, headers: retryAfterHeaders(3) }
  );
}

export async function POST(request: Request) {
  const config = getServerConfig();

  let input: unknown;
  try {
    input = await readJsonBody(request);
  } catch (error) {
    if (error instanceof HttpRequestError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.publicMessage } },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { error: { code: "INVALID_REQUEST", message: "The request could not be read." } },
      { status: 400 }
    );
  }

  const parsed = tipQuoteRequestSchema.safeParse(input);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Check the tip amount and try again." } },
      { status: 400 }
    );
  }
  const body = parsed.data;

  if (config.NEXT_PUBLIC_SUPABASE_URL && config.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    try {
      const supabase = await createSupabaseServerClient();
      const { data, error } = await supabase.rpc("quote_tip", {
        p_public_token: body.endpointToken,
        p_gross_gratuity_cents: body.grossGratuityCents
      });

      if (error) {
        const kind = classifySupabaseFailure(error);
        if (kind === "unavailable" || kind === "transient" || kind === "unknown") return unavailable();
        return NextResponse.json(
          { error: { code: "WORKER_UNAVAILABLE", message: "This SwiftTip profile is currently unavailable." } },
          { status: 404 }
        );
      }
      if (!data?.length) {
        return NextResponse.json(
          { error: { code: "WORKER_UNAVAILABLE", message: "This SwiftTip profile is currently unavailable." } },
          { status: 404 }
        );
      }
      return NextResponse.json({ quote: data[0] });
    } catch {
      return unavailable();
    }
  }

  if (config.SWIFTTIP_ENV === "production") return unavailable();
  if (body.endpointToken !== "T4K8P") {
    return NextResponse.json(
      { error: { code: "WORKER_UNAVAILABLE", message: "This SwiftTip profile is currently unavailable." } },
      { status: 404 }
    );
  }
  return NextResponse.json({
    demo: true,
    pricing: calculateTipPricing(body.grossGratuityCents),
    currency: "ZAR",
    pricingVersion: "working-v3-hypothesis"
  });
}

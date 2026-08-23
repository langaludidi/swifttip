import { NextResponse } from "next/server";
import { createTipRequestSchema } from "@/lib/contracts";
import { getServerConfig } from "@/lib/config";
import {
  HttpRequestError,
  classifySupabaseFailure,
  readJsonBody,
  retryAfterHeaders
} from "@/lib/http-resilience";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";

function unavailable(message = "SwiftTip is temporarily unavailable. Please try again.") {
  return NextResponse.json(
    { error: { code: "SERVICE_UNAVAILABLE", message } },
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

  const parsed = createTipRequestSchema.safeParse(input);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid tip request." } },
      { status: 400 }
    );
  }
  const body = parsed.data;

  if (!config.NEXT_PUBLIC_SUPABASE_URL || !config.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return unavailable();
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("create_tip", {
      p_public_token: body.endpointToken,
      p_gross_gratuity_cents: body.grossGratuityCents,
      p_idempotency_key: body.idempotencyKey
    });

    if (error) {
      const kind = classifySupabaseFailure(error);
      if (kind === "unavailable" || kind === "transient" || kind === "unknown") {
        return unavailable();
      }
      return NextResponse.json(
        { error: { code: "TIP_NOT_ACCEPTED", message: "We couldn't start this tip. Check the worker and amount, then try again." } },
        { status: 409 }
      );
    }

    if (!data?.length) return unavailable();

    const tip = data[0] as { swifttip_reference?: string };
    let receiptToken: string | null = null;
    let receiptStatus: "available" | "pending" = "available";

    if (tip.swifttip_reference) {
      const receiptResult = await supabase.rpc("get_customer_receipt_access", {
        p_reference: tip.swifttip_reference,
        p_idempotency_key: body.idempotencyKey
      });
      if (receiptResult.error) {
        // The canonical Tip already exists. Do not misreport that durable write as a
        // failed Tip creation merely because receipt-token retrieval is temporarily
        // unavailable. A same-key retry remains safe through database idempotency.
        receiptStatus = "pending";
      } else {
        receiptToken = ((receiptResult.data ?? []) as Array<{ receipt_token: string }>)[0]?.receipt_token ?? null;
        if (!receiptToken) receiptStatus = "pending";
      }
    }

    return NextResponse.json({ tip, receiptToken, receiptStatus }, { status: 201 });
  } catch {
    return unavailable();
  }
}

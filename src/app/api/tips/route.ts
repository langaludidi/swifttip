import { NextResponse } from "next/server";
import { createTipRequestSchema } from "@/lib/contracts";
import { getServerConfig } from "@/lib/config";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";

export async function POST(request: Request) {
  const config = getServerConfig();
  try {
    const body = createTipRequestSchema.parse(await request.json());
    if (!config.NEXT_PUBLIC_SUPABASE_URL || !config.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
      return NextResponse.json({ error: { code: "DATABASE_NOT_CONFIGURED", message: "The MVP v3 database has not been connected yet." } }, { status: 503 });
    }
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("create_tip", {
      p_public_token: body.endpointToken,
      p_gross_gratuity_cents: body.grossGratuityCents,
      p_idempotency_key: body.idempotencyKey
    });
    if (error || !data?.length) {
      return NextResponse.json({ error: { code: "TIP_CREATION_FAILED", message: "We couldn't start this tip. Please try again." } }, { status: 409 });
    }
    const tip = data[0] as { swifttip_reference?: string };
    let receiptToken: string | null = null;
    if (tip.swifttip_reference) {
      const receiptResult = await supabase.rpc("get_customer_receipt_access", {
        p_reference: tip.swifttip_reference,
        p_idempotency_key: body.idempotencyKey
      });
      receiptToken = ((receiptResult.data ?? []) as Array<{ receipt_token: string }>)[0]?.receipt_token ?? null;
    }
    return NextResponse.json({ tip, receiptToken }, { status: 201 });
  } catch {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid tip request." } }, { status: 400 });
  }
}

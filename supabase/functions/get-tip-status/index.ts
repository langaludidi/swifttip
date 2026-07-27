import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

// Public-facing: a customer waiting on their tip to settle after returning
// from Paystack checkout has no session, so RLS can't help them read `tips`
// directly. This exposes only status/amount for a reference they already hold.
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { reference } = await req.json();
    if (!reference) return json({ error: 'reference required' }, 400);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY')!,
    );

    const { data, error } = await supabase
      .from('tips')
      .select('id, status, amount_cents, created_at')
      .eq('gateway_ref', reference)
      .single();
    if (error || !data) return json({ error: 'tip not found' }, 404);

    let status = data.status;

    // Paystack sends no webhook event at all for a one-time-charge decline
    // (only `charge.success` exists — confirmed against Paystack's own docs) —
    // so a declined card leaves `status` stuck at 'pending' forever unless we
    // ask Paystack directly. Give the webhook a head start on the common,
    // fast success path before spending an API call on this.
    const ageMs = Date.now() - new Date(data.created_at).getTime();
    const VERIFY_AFTER_MS = 4000;
    // Paystack reports 'abandoned' for ANY not-yet-completed transaction —
    // including one a live customer is still actively typing card details
    // into. Only 'failed' (an actual gateway decline) is a definite outcome
    // worth surfacing immediately; 'abandoned' only becomes trustworthy once
    // a real checkout session would plausibly have ended.
    const ABANDONED_GRACE_MS = 15 * 60 * 1000;

    if (status === 'pending' && ageMs > VERIFY_AFTER_MS) {
      try {
        const verifyRes = await fetch(
          `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
          { headers: { Authorization: `Bearer ${Deno.env.get('PAYSTACK_SECRET_KEY')}` } },
        );
        const verify = await verifyRes.json();
        const gatewayStatus = verify?.data?.status; // 'success' | 'abandoned' | 'failed'

        const shouldFail = verifyRes.ok && (
          gatewayStatus === 'failed' ||
          (gatewayStatus === 'abandoned' && ageMs > ABANDONED_GRACE_MS)
        );

        if (shouldFail) {
          // Guard on the row still being 'pending' so a webhook that settles
          // concurrently between our read and this write can never be
          // clobbered back to 'failed'.
          const { data: updated } = await supabase
            .from('tips')
            .update({ status: 'failed' })
            .eq('id', data.id)
            .eq('status', 'pending')
            .select('status')
            .single();
          if (updated) status = updated.status;
        }
        // gatewayStatus === 'success': leave status as 'pending'. Settlement
        // stays exclusively `paystack-webhook`'s job — this function never
        // calls `settle_tip`, it only unblocks the failure path the webhook
        // can't ever report.
        // gatewayStatus === 'abandoned' within the grace window: also leave
        // as 'pending' — a live payer, not yet a failure.
      } catch {
        // Verify call itself failing (network, bad response) just means we
        // fall back to the DB's current status — never surface this as an
        // error to a customer waiting on their payment.
      }
    }

    return json({ tip_id: data.id, status, amount_cents: data.amount_cents });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});

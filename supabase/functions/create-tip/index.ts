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

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { worker_id, amount_cents, note, customer_session, customer_email } = await req.json();

    if (!worker_id || !amount_cents || amount_cents <= 0) {
      return json({ error: 'worker_id and positive amount_cents required' }, 400);
    }
    if (amount_cents < 500 || amount_cents > 100000) {
      return json({ error: 'tip must be between R5 and R1000' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY')!,
    );

    // Worker must exist and be active
    const { data: worker, error: workerErr } = await supabase
      .from('workers').select('id, active').eq('id', worker_id).single();
    if (workerErr || !worker?.active) return json({ error: 'worker not found or inactive' }, 404);

    // Pending tip — settles ONLY via webhook after real payment
    const { data: tip, error: tipErr } = await supabase
      .from('tips')
      .insert({ worker_id, amount_cents, note, customer_session, status: 'pending' })
      .select().single();
    if (tipErr) throw tipErr;

    // Initialize Paystack transaction (ZAR, amount in cents)
    const psRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('PAYSTACK_SECRET_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: customer_email || `tipper-${tip.id}@swifttip.app`,
        amount: amount_cents,
        currency: 'ZAR',
        metadata: { tip_id: tip.id },
      }),
    });
    const ps = await psRes.json();

    if (!psRes.ok || !ps.status) {
      await supabase.from('tips').update({ status: 'failed' }).eq('id', tip.id);
      return json({ error: ps.message ?? 'payment initialization failed' }, 502);
    }

    // Store Paystack reference for webhook reconciliation
    await supabase.from('tips').update({ gateway_ref: ps.data.reference }).eq('id', tip.id);

    return json({
      tip_id: tip.id,
      authorization_url: ps.data.authorization_url,
      reference: ps.data.reference,
    });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});

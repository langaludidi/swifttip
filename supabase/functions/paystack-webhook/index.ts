import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-paystack-signature',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

async function hmacSha512Hex(secret: string, payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-512' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  // Must read the raw body text before any JSON parsing — the HMAC is
  // computed over the exact bytes Paystack sent, not a re-serialized copy.
  const rawBody = await req.text();

  try {
    const signature = req.headers.get('x-paystack-signature') ?? '';
    const secret = Deno.env.get('PAYSTACK_SECRET_KEY') ?? '';
    const expected = secret ? await hmacSha512Hex(secret, rawBody) : '';

    if (!secret || !signature || signature !== expected) {
      return json({ error: 'invalid signature' }, 401);
    }

    const event = JSON.parse(rawBody);

    if (event.event === 'charge.success') {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY')!,
      );

      let tipId = event.data?.metadata?.tip_id ?? null;
      if (!tipId && event.data?.reference) {
        const { data: tip } = await supabase
          .from('tips').select('id').eq('gateway_ref', event.data.reference).single();
        tipId = tip?.id ?? null;
      }

      // settle_tip() is idempotent — safe if Paystack retries this webhook.
      if (tipId) {
        const { error } = await supabase.rpc('settle_tip', { tip_id: tipId });
        if (error) throw error;
      }
    }

    return json({ ok: true });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});

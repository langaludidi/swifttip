import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

// Disabled 2026-07-14: this function had no caller-auth check and let anyone
// with the public anon key force-settle any tip_id (including unpaid ones
// created via create-tip), crediting a worker's wallet with money that was
// never paid. It is also redundant now that paystack-webhook calls
// settle_tip() directly after verifying the Paystack HMAC signature itself.
// Do not re-enable this without a caller-auth check (and there is still no
// legitimate reason for it to exist alongside paystack-webhook).
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }
  return new Response(JSON.stringify({ error: 'disabled' }), {
    status: 410,
    headers: { 'Content-Type': 'application/json' },
  });
});

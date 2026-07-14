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
      .select('id, status, amount_cents')
      .eq('gateway_ref', reference)
      .single();
    if (error || !data) return json({ error: 'tip not found' }, 404);

    return json({ tip_id: data.id, status: data.status, amount_cents: data.amount_cents });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});

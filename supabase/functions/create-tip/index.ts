import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { worker_id, amount_cents, note, customer_session } = await req.json();

    if (!worker_id || !amount_cents || amount_cents <= 0) {
      return new Response(JSON.stringify({ error: 'worker_id and positive amount_cents required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY')!,
    );

    // Insert tip
    const { data: tip, error: tipErr } = await supabase
      .from('tips')
      .insert({ worker_id, amount_cents, note, customer_session, status: 'pending' })
      .select()
      .single();

    if (tipErr) throw tipErr;

    // Settle immediately (calls stored procedure)
    const { error: settleErr } = await supabase.rpc('settle_tip', { tip_id: tip.id });
    if (settleErr) throw settleErr;

    return new Response(JSON.stringify({ tip_id: tip.id, amount_cents }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

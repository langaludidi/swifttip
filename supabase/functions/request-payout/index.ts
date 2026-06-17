import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { worker_id, amount_cents } = await req.json();
    if (!worker_id || !amount_cents || amount_cents <= 0) {
      return new Response(JSON.stringify({ error: 'worker_id and positive amount_cents required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY')!,
    );

    // Get wallet and verify sufficient balance
    const { data: wallet, error: walletErr } = await supabase
      .from('wallets')
      .select('id, balance_cents')
      .eq('owner_id', worker_id)
      .single();
    if (walletErr) throw walletErr;
    if (wallet.balance_cents < amount_cents) {
      return new Response(JSON.stringify({ error: 'Insufficient balance' }), {
        status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Debit wallet atomically
    const { error: debitErr } = await supabase
      .from('wallets')
      .update({ balance_cents: wallet.balance_cents - amount_cents, updated_at: new Date().toISOString() })
      .eq('id', wallet.id)
      .eq('balance_cents', wallet.balance_cents); // optimistic lock
    if (debitErr) throw debitErr;

    // Insert payout record
    const { data: payout, error: payoutErr } = await supabase
      .from('payouts')
      .insert({ worker_id, amount_cents, status: 'requested' })
      .select()
      .single();
    if (payoutErr) throw payoutErr;

    // Ledger debit entry
    const { error: ledgerErr } = await supabase
      .from('ledger_entries')
      .insert({ wallet_id: wallet.id, payout_id: payout.id, kind: 'debit', amount_cents });
    if (ledgerErr) throw ledgerErr;

    return new Response(JSON.stringify({ payout_id: payout.id, amount_cents }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

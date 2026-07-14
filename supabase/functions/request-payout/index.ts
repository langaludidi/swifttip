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
    const { amount_cents } = await req.json();
    if (!amount_cents || amount_cents <= 0) {
      return json({ error: 'positive amount_cents required' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY')!,
    );

    // The caller's own JWT decides which worker this is for — a client-supplied
    // worker_id is never trusted. This is the only thing standing between any
    // holder of the public anon key and draining an arbitrary worker's wallet.
    const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    const { data: { user }, error: userErr } = await supabase.auth.getUser(jwt);
    if (userErr || !user) return json({ error: 'authentication required' }, 401);

    const { data: worker, error: workerErr } = await supabase
      .from('workers').select('id').eq('profile_id', user.id).single();
    if (workerErr || !worker) return json({ error: 'no worker profile for this account' }, 403);
    const worker_id = worker.id;

    // Get wallet and verify sufficient balance
    const { data: wallet, error: walletErr } = await supabase
      .from('wallets')
      .select('id, balance_cents')
      .eq('owner_id', worker_id)
      .single();
    if (walletErr) throw walletErr;
    if (wallet.balance_cents < amount_cents) {
      return json({ error: 'Insufficient balance' }, 422);
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

    return json({ payout_id: payout.id, amount_cents });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});

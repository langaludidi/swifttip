import { supabase, isDemo } from './supabase.js';

export async function requestPayout({ workerId, amountCents }) {
  if (isDemo) {
    return { payout: { id: 'demo-payout', amount_cents: amountCents }, error: null };
  }
  const { data, error } = await supabase.functions.invoke('request-payout', {
    body: { worker_id: workerId, amount_cents: amountCents },
  });
  return { payout: data, error };
}

export async function setPayoutStatus({ payoutId, status }) {
  if (isDemo) return { error: null };
  const { data, error } = await supabase.functions.invoke('set-payout-status', {
    body: { payout_id: payoutId, status },
  });
  return { result: data, error };
}

export async function getWorkerPayouts(workerId) {
  if (isDemo) return { payouts: [], error: null };
  const { data, error } = await supabase
    .from('payouts')
    .select('*')
    .eq('worker_id', workerId)
    .order('requested_at', { ascending: false });
  return { payouts: data ?? [], error };
}

export async function getAllPayouts() {
  if (isDemo) return { payouts: [], error: null };
  const { data, error } = await supabase
    .from('payouts')
    .select('*, workers(*, profiles(full_name))')
    .order('requested_at', { ascending: false });
  return { payouts: data ?? [], error };
}

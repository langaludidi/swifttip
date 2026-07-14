import { supabase, isDemo } from './supabase.js';

export async function invokeTip({ workerId, amountCents, note, customerSession, callbackUrl }) {
  if (isDemo) {
    return { tip: { id: 'demo-tip', amount_cents: amountCents }, error: null };
  }
  const { data, error } = await supabase.functions.invoke('create-tip', {
    body: { worker_id: workerId, amount_cents: amountCents, note, customer_session: customerSession, callback_url: callbackUrl },
  });
  if (error) return { tip: null, error };
  if (data?.error) return { tip: null, error: new Error(data.error) };
  return { tip: data, error: null };
}

export async function getTipStatus(reference) {
  if (isDemo) return { status: 'settled', amountCents: 0, tipId: 'demo-tip', error: null };
  const { data, error } = await supabase.functions.invoke('get-tip-status', { body: { reference } });
  if (error) return { status: null, error };
  if (data?.error) return { status: null, error: new Error(data.error) };
  return { status: data.status, amountCents: data.amount_cents, tipId: data.tip_id, error: null };
}

export async function getWorkerTips(workerId) {
  if (isDemo) return { tips: [], error: null };
  const { data, error } = await supabase
    .from('tips')
    .select('*')
    .eq('worker_id', workerId)
    .order('created_at', { ascending: false })
    .limit(50);
  return { tips: data ?? [], error };
}

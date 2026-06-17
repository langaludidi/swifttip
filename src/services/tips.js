import { supabase, isDemo } from './supabase.js';

export async function invokeTip({ workerId, amountCents, note, customerSession }) {
  if (isDemo) {
    return { tip: { id: 'demo-tip', amount_cents: amountCents }, error: null };
  }
  const { data, error } = await supabase.functions.invoke('create-tip', {
    body: { worker_id: workerId, amount_cents: amountCents, note, customer_session: customerSession },
  });
  return { tip: data, error };
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

import { supabase, isDemo } from './supabase.js';
import { SAMPLE } from '../lib/data.js';

export async function getWorkerBySlug(slug) {
  if (isDemo) {
    const w = SAMPLE.workers.find(x => x.name.toLowerCase().replace(/\s+/g, '-') === slug);
    return { worker: w ?? SAMPLE.workers[0], error: null };
  }
  const { data, error } = await supabase
    .from('workers')
    .select('*, profiles(full_name, phone)')
    .eq('slug', slug)
    .eq('active', true)
    .single();
  return { worker: data, error };
}

export async function getWorkers(employerId) {
  if (isDemo) return { workers: SAMPLE.workers, error: null };
  const { data, error } = await supabase
    .from('workers')
    .select('*, profiles(full_name), wallets(balance_cents)')
    .eq('employer_id', employerId)
    .eq('active', true);
  return { workers: data ?? [], error };
}

export async function getWorkerWallet(workerId) {
  if (isDemo) return { balance_cents: Math.round(SAMPLE.self.balance * 100), error: null };
  const { data, error } = await supabase
    .from('wallets')
    .select('balance_cents')
    .eq('owner_id', workerId)
    .single();
  return { balance_cents: data?.balance_cents ?? 0, error };
}

export async function setWorkerActive(workerId, active) {
  if (isDemo) return { error: null };
  const { error } = await supabase
    .from('workers')
    .update({ active })
    .eq('id', workerId);
  return { error };
}

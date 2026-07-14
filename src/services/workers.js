import { supabase, isDemo } from './supabase.js';
import { SAMPLE } from '../lib/data.js';

const AVATAR_COLORS = ['red', 'purple', 'teal', 'gold', 'blue'];

function colorForId(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// `workers` has no profiles(full_name, phone) embed on the public tip page —
// RLS only lets a profile owner read their own row, so that join returns null
// for every customer. display_name exists on `workers` for exactly this reason.
function mapPublicWorker(row) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.display_name || 'Worker',
    role: row.job_title || 'Staff',
    color: colorForId(row.id),
    rating: 5.0,
    tips: 0,
  };
}

export async function getWorkerBySlug(slug) {
  if (isDemo) {
    const w = SAMPLE.workers.find(x => x.name.toLowerCase().replace(/\s+/g, '-') === slug);
    return { worker: w ?? SAMPLE.workers[0], error: null };
  }
  const { data, error } = await supabase
    .from('workers')
    .select('id, slug, display_name, job_title')
    .eq('slug', slug)
    .eq('active', true)
    .single();
  if (error || !data) return { worker: null, error };
  return { worker: mapPublicWorker(data), error: null };
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

// Only called with non-empty bank + accNo — the caller decides whether the
// worker actually submitted banking details or skipped that step.
export async function addPayoutAccount({ workerId, bank, accNo, accountType }) {
  if (isDemo) return { error: null };
  const { error } = await supabase.from('payout_accounts').insert({
    worker_id: workerId,
    bank_name: bank,
    account_number: accNo,
    account_type: accountType,
  });
  return { error };
}

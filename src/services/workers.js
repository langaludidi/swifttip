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

// Was hardcoded to employer-scoped, active-only workers — unusable for e.g.
// an admin queue of workers pending KYC review (active is false for those by
// definition). Never called anywhere until now, so free to generalize: pass
// only the filters you need.
export async function getWorkers({ employerId, statusIn, active } = {}) {
  if (isDemo) return { workers: SAMPLE.workers, error: null };
  let query = supabase
    .from('workers')
    .select('id, slug, display_name, job_title, station, status, active, submitted_at, reviewed_at, rejection_reason, created_at, profiles(full_name, phone)');
  if (employerId) query = query.eq('employer_id', employerId);
  if (statusIn) query = query.in('status', statusIn);
  if (active !== undefined) query = query.eq('active', active);
  const { data, error } = await query.order('submitted_at', { ascending: true, nullsFirst: false });
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

function randomSlugSuffix() {
  return Math.random().toString(36).slice(2, 6);
}

// slug is derived from the worker's name with no uniqueness check up front —
// two workers with the same or similar name collide on workers_slug_key.
// Retries with a short random suffix appended on conflict, a few times, so
// signup fails only if something else is actually wrong.
export async function createWorker({ profileId, displayName, slug, jobTitle, station }) {
  if (isDemo) return { worker: { id: 'demo', slug }, error: null };
  let candidate = slug;
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await supabase.from('workers').insert({
      profile_id: profileId,
      display_name: displayName,
      slug: candidate,
      job_title: jobTitle,
      station: station || null,
    }).select('id, slug').single();
    if (!error) return { worker: data, error: null };
    if (error.code !== '23505') return { worker: null, error };
    candidate = `${slug}-${randomSlugSuffix()}`;
  }
  return { worker: null, error: new Error('Could not generate a unique profile link — please try again.') };
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

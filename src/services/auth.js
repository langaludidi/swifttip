import { supabase, isDemo } from './supabase.js';

export async function signUp({ email, password, fullName, phone, role }) {
  if (isDemo) return { user: { id: 'demo', email }, error: null };

  // A signup call's only job is to mint a brand new identity — it must never
  // silently act as whoever happens to already be logged in (e.g. an owner
  // assisting a worker's onboarding on a shared device, per the pilot's
  // assisted-onboarding model). Without this, a stale session survives
  // supabase.auth.signUp() below untouched, and the new worker row attaches
  // to the wrong identity entirely — this is the exact bug that shipped.
  await supabase.auth.signOut();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, phone, role } },
  });
  if (error) return { user: null, error };

  // Supabase deliberately never errors signUp() for an already-registered
  // email (to avoid letting a caller enumerate which emails exist) — it
  // silently returns a user object with an empty `identities` array instead.
  // Undetected, that looks exactly like a successful new signup.
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    return { user: null, error: new Error('This email already has an account — log in instead.') };
  }

  return { user: data?.user, error: null };
}

export async function signIn({ email, password }) {
  if (isDemo) return { user: { id: 'demo', email }, error: null };
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { user: data?.user, error };
}

export async function signOut() {
  if (isDemo) return;
  await supabase.auth.signOut();
}

export async function getSession() {
  if (isDemo) return null;
  const { data } = await supabase.auth.getSession();
  return data?.session ?? null;
}

// Worker onboarding fields, held until email confirmation completes and the
// worker's first sign-in can finish creating their `workers` row (no session
// exists yet right after signUp() when email confirmation is required).
const PENDING_WORKER_KEY = 'swifttip_pending_worker';

export function savePendingWorker(fields) {
  localStorage.setItem(PENDING_WORKER_KEY, JSON.stringify(fields));
}

export function getPendingWorker(email) {
  try {
    const raw = localStorage.getItem(PENDING_WORKER_KEY);
    if (!raw) return null;
    const pending = JSON.parse(raw);
    return pending?.email === email ? pending : null;
  } catch {
    return null;
  }
}

export function clearPendingWorker() {
  localStorage.removeItem(PENDING_WORKER_KEY);
}

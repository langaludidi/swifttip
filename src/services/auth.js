import { supabase, isDemo } from './supabase.js';

export async function signUp({ email, password, fullName, phone, role }) {
  if (isDemo) return { user: { id: 'demo', email }, error: null };
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, phone, role } },
  });
  return { user: data?.user, error };
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

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

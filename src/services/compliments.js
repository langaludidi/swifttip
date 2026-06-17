import { supabase, isDemo } from './supabase.js';

export async function leaveCompliment({ tipId, stars, note }) {
  if (isDemo) return { error: null };
  const { data, error } = await supabase.functions.invoke('leave-compliment', {
    body: { tip_id: tipId, stars, note },
  });
  return { result: data, error };
}

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

// Transitions a worker draft/rejected -> submitted. Deliberately narrow: this
// function only ever writes status + submitted_at, never active or anything
// else — a client-side update could smuggle other fields into the same
// request, so this transition is not exposed as a direct table write.
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY')!,
    );

    const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    const { data: { user }, error: userErr } = await supabase.auth.getUser(jwt);
    if (userErr || !user) return json({ error: 'authentication required' }, 401);

    const { data: worker, error: workerErr } = await supabase
      .from('workers').select('id, status').eq('profile_id', user.id).single();
    if (workerErr || !worker) return json({ error: 'no worker profile for this account' }, 403);

    if (worker.status !== 'draft' && worker.status !== 'rejected') {
      return json({ error: `cannot submit from status '${worker.status}'` }, 409);
    }

    // At least one document, enforced server-side — a client-side-only check
    // would be trivially bypassable.
    const { count, error: countErr } = await supabase
      .from('kyc_documents')
      .select('id', { count: 'exact', head: true })
      .eq('worker_id', worker.id);
    if (countErr) throw countErr;
    if (!count || count < 1) return json({ error: 'upload at least one document before submitting' }, 422);

    const { error: updateErr } = await supabase
      .from('workers')
      .update({ status: 'submitted', submitted_at: new Date().toISOString(), rejection_reason: null })
      .eq('id', worker.id);
    if (updateErr) throw updateErr;

    return json({ ok: true, status: 'submitted' });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});

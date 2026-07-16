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

const SIGNED_URL_TTL_SECONDS = 600;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY')!,
    );

    // Admin gate — covers BOTH viewing documents (signed URLs into someone's
    // ID) and deciding. Same pattern as set-payout-status (Sprint 1).
    const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    const { data: { user }, error: userErr } = await supabase.auth.getUser(jwt);
    if (userErr || !user) return json({ error: 'authentication required' }, 401);

    const { data: profile, error: profileErr } = await supabase
      .from('profiles').select('role').eq('id', user.id).single();
    if (profileErr || profile?.role !== 'admin') return json({ error: 'admin role required' }, 403);

    const { worker_id, decision, rejection_reason } = await req.json();
    if (!worker_id) return json({ error: 'worker_id required' }, 400);

    // DECIDE mode: approve or reject. All the actual mutation + audit logging
    // happens atomically in decide_kyc() — this function never touches
    // `active` or `status` directly.
    if (decision) {
      if (decision !== 'approved' && decision !== 'rejected') {
        return json({ error: "decision must be 'approved' or 'rejected'" }, 400);
      }
      const { error } = await supabase.rpc('decide_kyc', {
        p_worker_id: worker_id,
        p_decision: decision,
        p_reason: rejection_reason ?? null,
        p_actor_id: user.id,
      });
      if (error) return json({ error: error.message }, 422);
      return json({ ok: true, status: decision });
    }

    // GET mode: fetch the worker + signed URLs for their documents so an
    // admin can actually look at them. Signed URLs are the only way this
    // bucket's contents are ever readable — there is no SELECT policy on it.
    const { data: worker, error: workerErr } = await supabase
      .from('workers')
      .select('id, display_name, job_title, station, status, submitted_at, reviewed_at, rejection_reason')
      .eq('id', worker_id)
      .single();
    if (workerErr || !worker) return json({ error: 'worker not found' }, 404);

    // Entering review — flip submitted -> under_review. Best-effort: a
    // worker just viewing their own status isn't affected either way.
    if (worker.status === 'submitted') {
      await supabase.from('workers').update({ status: 'under_review' }).eq('id', worker_id);
      worker.status = 'under_review';
    }

    const { data: docs, error: docsErr } = await supabase
      .from('kyc_documents')
      .select('id, document_type, storage_path, uploaded_at')
      .eq('worker_id', worker_id);
    if (docsErr) throw docsErr;

    const documents = await Promise.all((docs ?? []).map(async (d) => {
      const { data: signed } = await supabase.storage
        .from('kyc')
        .createSignedUrl(d.storage_path, SIGNED_URL_TTL_SECONDS);
      return {
        id: d.id,
        document_type: d.document_type,
        uploaded_at: d.uploaded_at,
        signed_url: signed?.signedUrl ?? null,
      };
    }));

    return json({ worker, documents });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});

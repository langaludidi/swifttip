import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VALID_STATUSES = ['approved', 'paid', 'rejected'] as const;
type PayoutStatus = typeof VALID_STATUSES[number];

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { payout_id, status } = await req.json() as { payout_id: string; status: PayoutStatus };
    if (!payout_id || !status) {
      return new Response(JSON.stringify({ error: 'payout_id and status required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!VALID_STATUSES.includes(status)) {
      return new Response(JSON.stringify({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY')!,
    );

    // Only an admin may change a payout's status — this function runs with the
    // service role and bypasses RLS entirely, so this check IS the enforcement.
    const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    const { data: { user }, error: userErr } = await supabase.auth.getUser(jwt);
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'authentication required' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { data: profile, error: profileErr } = await supabase
      .from('profiles').select('role').eq('id', user.id).single();
    if (profileErr || profile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'admin role required' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const update: Record<string, unknown> = { status };
    if (status === 'paid') update.settled_at = new Date().toISOString();

    const { error } = await supabase
      .from('payouts')
      .update(update)
      .eq('id', payout_id);
    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, payout_id, status }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

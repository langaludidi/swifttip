-- SwiftTip MVP v3 — Admin projections and database-level MFA/role enforcement

create or replace function private.require_admin_role(p_allowed_roles text[])
returns text
language plpgsql
stable
security definer
set search_path = public, private
as $$
declare
  v_role text;
  v_aal text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select a.admin_role into v_role
  from public.admin_memberships a
  where a.user_id = auth.uid() and a.admin_status = 'active'
  limit 1;

  if v_role is null or not (v_role = any(p_allowed_roles)) then
    raise exception 'Admin role not authorised';
  end if;

  v_aal := coalesce(auth.jwt() ->> 'aal', 'aal1');
  if v_aal <> 'aal2' then raise exception 'MFA assurance level required'; end if;
  return v_role;
end;
$$;
revoke all on function private.require_admin_role(text[]) from public;
grant execute on function private.require_admin_role(text[]) to authenticated;

create or replace function public.admin_get_dashboard()
returns table (
  settlement_exceptions bigint,
  reconciliation_exceptions bigint,
  pending_verifications bigint,
  refund_requests bigint,
  open_disputes bigint,
  successful_tips_7d bigint,
  gross_gratuity_7d_cents bigint,
  swifttip_gross_revenue_7d_cents bigint,
  provider_cost_7d_cents bigint,
  contribution_7d_cents bigint
)
language plpgsql
stable
security definer
set search_path = public, private
as $$
declare
  v_role text;
begin
  v_role := private.require_admin_role(array['operations_admin','verification_admin','finance_admin','security_admin','super_admin']);

  return query
  select
    (select count(*)::bigint from public.settlements s where s.settlement_state in ('failed','exception')),
    (select count(*)::bigint from private.reconciliation_records r where r.reconciliation_status = 'exception'),
    (select count(*)::bigint from public.worker_verifications wv where wv.verification_status in ('submitted','under_review','additional_info_required')),
    (select count(*)::bigint from public.refunds r where r.refund_status in ('requested','under_review','approved','submitted')),
    (select count(*)::bigint from public.disputes d where d.dispute_status in ('open','evidence_required','evidence_submitted')),
    (select count(*)::bigint from public.tips t where t.tip_status = 'completed' and t.completed_at >= now() - interval '7 days'),
    (select coalesce(sum(t.gross_gratuity_cents),0)::bigint from public.tips t where t.tip_status = 'completed' and t.completed_at >= now() - interval '7 days'),
    (select coalesce(sum(t.swifttip_gross_revenue_cents),0)::bigint from public.tips t where t.tip_status = 'completed' and t.completed_at >= now() - interval '7 days'),
    (select coalesce(sum(pf.amount_cents),0)::bigint from private.provider_fees pf join public.tips t on t.id = pf.tip_id where t.tip_status = 'completed' and t.completed_at >= now() - interval '7 days'),
    (
      (select coalesce(sum(t.swifttip_gross_revenue_cents),0)::bigint from public.tips t where t.tip_status = 'completed' and t.completed_at >= now() - interval '7 days')
      -
      (select coalesce(sum(pf.amount_cents),0)::bigint from private.provider_fees pf join public.tips t on t.id = pf.tip_id where t.tip_status = 'completed' and t.completed_at >= now() - interval '7 days')
    )::bigint;
end;
$$;
revoke all on function public.admin_get_dashboard() from public;
grant execute on function public.admin_get_dashboard() to authenticated;

create or replace function public.admin_get_recent_transactions(p_limit integer default 25)
returns table (
  swifttip_reference text,
  completed_at timestamptz,
  worker_display_name text,
  venue_name text,
  customer_total_cents bigint,
  gross_gratuity_cents bigint,
  worker_net_cents bigint,
  swifttip_gross_revenue_cents bigint,
  provider_cost_cents bigint,
  contribution_cents bigint,
  settlement_state text
)
language plpgsql
stable
security definer
set search_path = public, private
as $$
begin
  perform private.require_admin_role(array['operations_admin','finance_admin','super_admin']);
  if p_limit < 1 or p_limit > 100 then raise exception 'Limit outside allowed range'; end if;

  return query
  select
    t.swifttip_reference,
    t.completed_at,
    t.worker_display_name_snapshot,
    t.venue_name_snapshot,
    t.customer_total_cents,
    t.gross_gratuity_cents,
    t.worker_net_cents,
    t.swifttip_gross_revenue_cents,
    coalesce(f.provider_cost_cents,0)::bigint,
    (t.swifttip_gross_revenue_cents - coalesce(f.provider_cost_cents,0))::bigint,
    coalesce(s.settlement_state,'pending')::text
  from public.tips t
  left join lateral (
    select sum(pf.amount_cents)::bigint as provider_cost_cents
    from private.provider_fees pf where pf.tip_id = t.id
  ) f on true
  left join public.financial_allocations a on a.tip_id = t.id and a.allocation_type = 'worker_net'
  left join lateral (
    select se.settlement_state
    from public.settlements se where se.allocation_id = a.id
    order by se.created_at desc limit 1
  ) s on true
  where t.tip_status = 'completed'
  order by t.completed_at desc nulls last, t.created_at desc
  limit p_limit;
end;
$$;
revoke all on function public.admin_get_recent_transactions(integer) from public;
grant execute on function public.admin_get_recent_transactions(integer) to authenticated;

create or replace function public.admin_get_transaction_detail(p_reference text)
returns table (
  tip_id uuid,
  swifttip_reference text,
  worker_display_name text,
  worker_role text,
  venue_name text,
  completed_at timestamptz,
  customer_total_cents bigint,
  gross_gratuity_cents bigint,
  customer_fee_cents bigint,
  worker_fee_cents bigint,
  worker_net_cents bigint,
  swifttip_gross_revenue_cents bigint,
  provider_cost_cents bigint,
  contribution_cents bigint,
  payment_state text,
  provider_payment_ref text,
  settlement_state text,
  expected_settlement_cents bigint,
  actual_settlement_cents bigint,
  provider_settlement_ref text,
  reconciliation_status text
)
language plpgsql
stable
security definer
set search_path = public, private
as $$
begin
  perform private.require_admin_role(array['operations_admin','finance_admin','super_admin']);

  return query
  select
    t.id,
    t.swifttip_reference,
    t.worker_display_name_snapshot,
    t.worker_role_snapshot,
    t.venue_name_snapshot,
    t.completed_at,
    t.customer_total_cents,
    t.gross_gratuity_cents,
    t.customer_fee_cents,
    t.worker_fee_cents,
    t.worker_net_cents,
    t.swifttip_gross_revenue_cents,
    coalesce(f.provider_cost_cents,0)::bigint,
    (t.swifttip_gross_revenue_cents - coalesce(f.provider_cost_cents,0))::bigint,
    pa.payment_state,
    pa.provider_payment_ref,
    coalesce(s.settlement_state,'pending')::text,
    s.expected_amount_cents,
    s.actual_amount_cents,
    s.provider_settlement_ref,
    coalesce(r.reconciliation_status,'pending')::text
  from public.tips t
  left join lateral (
    select p.payment_state, p.provider_payment_ref
    from public.payment_attempts p
    where p.tip_id = t.id
    order by case when p.payment_state = 'succeeded' then 0 else 1 end, p.created_at desc
    limit 1
  ) pa on true
  left join public.financial_allocations a on a.tip_id = t.id and a.allocation_type = 'worker_net'
  left join lateral (
    select se.settlement_state, se.expected_amount_cents, se.actual_amount_cents, se.provider_settlement_ref
    from public.settlements se where se.allocation_id = a.id
    order by se.created_at desc limit 1
  ) s on true
  left join lateral (
    select sum(pf.amount_cents)::bigint as provider_cost_cents
    from private.provider_fees pf where pf.tip_id = t.id
  ) f on true
  left join lateral (
    select rr.reconciliation_status
    from private.reconciliation_records rr
    where rr.tip_id = t.id and rr.reconciliation_type = 'overall_transaction'
    order by rr.created_at desc limit 1
  ) r on true
  where t.swifttip_reference = p_reference
  limit 1;
end;
$$;
revoke all on function public.admin_get_transaction_detail(text) from public;
grant execute on function public.admin_get_transaction_detail(text) to authenticated;

create or replace function public.admin_get_settlement_exceptions(p_limit integer default 50)
returns table (
  settlement_id uuid,
  swifttip_reference text,
  worker_display_name text,
  venue_name text,
  settlement_state text,
  expected_amount_cents bigint,
  actual_amount_cents bigint,
  provider_code text,
  provider_settlement_ref text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, private
as $$
begin
  perform private.require_admin_role(array['operations_admin','finance_admin','super_admin']);
  if p_limit < 1 or p_limit > 200 then raise exception 'Limit outside allowed range'; end if;

  return query
  select
    s.id,
    t.swifttip_reference,
    t.worker_display_name_snapshot,
    t.venue_name_snapshot,
    s.settlement_state,
    s.expected_amount_cents,
    s.actual_amount_cents,
    s.provider_code,
    s.provider_settlement_ref,
    s.created_at
  from public.settlements s
  join public.financial_allocations a on a.id = s.allocation_id and a.allocation_type = 'worker_net'
  join public.tips t on t.id = a.tip_id
  where s.settlement_state in ('failed','exception','held')
  order by case s.settlement_state when 'exception' then 0 when 'failed' then 1 else 2 end, s.created_at
  limit p_limit;
end;
$$;
revoke all on function public.admin_get_settlement_exceptions(integer) from public;
grant execute on function public.admin_get_settlement_exceptions(integer) to authenticated;

create or replace function public.admin_get_verification_queue(p_limit integer default 50)
returns table (
  verification_id uuid,
  worker_id uuid,
  display_name text,
  verification_type text,
  verification_status text,
  submitted_at timestamptz,
  venue_name text
)
language plpgsql
stable
security definer
set search_path = public, private
as $$
begin
  perform private.require_admin_role(array['operations_admin','verification_admin','super_admin']);
  if p_limit < 1 or p_limit > 200 then raise exception 'Limit outside allowed range'; end if;

  return query
  select
    wv.id,
    w.id,
    w.display_first_name,
    wv.verification_type,
    wv.verification_status,
    wv.submitted_at,
    coalesce(v.branch_name, v.trading_name)
  from public.worker_verifications wv
  join public.workers w on w.id = wv.worker_id
  left join public.worker_venue_associations a on a.worker_id = w.id and a.ended_at is null
  left join public.venues v on v.id = a.venue_id
  where wv.verification_status in ('submitted','under_review','additional_info_required')
  order by wv.submitted_at nulls first, wv.created_at
  limit p_limit;
end;
$$;
revoke all on function public.admin_get_verification_queue(integer) from public;
grant execute on function public.admin_get_verification_queue(integer) to authenticated;

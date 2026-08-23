-- SwiftTip MVP v3 — Worker financial projections
-- These functions expose only the authenticated worker's own transaction truth.

create or replace function public.get_worker_recent_tips(p_limit integer default 20)
returns table (
  swifttip_reference text,
  gross_gratuity_cents bigint,
  worker_fee_cents bigint,
  worker_net_cents bigint,
  completed_at timestamptz,
  settlement_state text,
  settlement_expected_cents bigint,
  settlement_actual_cents bigint
)
language plpgsql
stable
security definer
set search_path = public, private
as $$
declare
  v_worker_id uuid;
begin
  v_worker_id := private.current_worker_id();
  if v_worker_id is null then
    raise exception 'Worker access required';
  end if;
  if p_limit < 1 or p_limit > 100 then
    raise exception 'Limit outside allowed range';
  end if;

  return query
  select
    t.swifttip_reference,
    t.gross_gratuity_cents,
    t.worker_fee_cents,
    t.worker_net_cents,
    t.completed_at,
    coalesce(s.settlement_state, 'pending')::text,
    s.expected_amount_cents,
    s.actual_amount_cents
  from public.tips t
  left join public.financial_allocations a
    on a.tip_id = t.id and a.allocation_type = 'worker_net'
  left join lateral (
    select se.settlement_state, se.expected_amount_cents, se.actual_amount_cents
    from public.settlements se
    where se.allocation_id = a.id
    order by se.created_at desc
    limit 1
  ) s on true
  where t.worker_id = v_worker_id
    and t.tip_status = 'completed'
  order by t.completed_at desc nulls last, t.created_at desc
  limit p_limit;
end;
$$;
revoke all on function public.get_worker_recent_tips(integer) from public;
grant execute on function public.get_worker_recent_tips(integer) to authenticated;

create or replace function public.get_worker_tip_detail(p_reference text)
returns table (
  swifttip_reference text,
  gross_gratuity_cents bigint,
  worker_fee_cents bigint,
  worker_net_cents bigint,
  currency char(3),
  venue_name text,
  worker_role text,
  completed_at timestamptz,
  payment_state text,
  payment_provider_completed_at timestamptz,
  settlement_state text,
  settlement_expected_cents bigint,
  settlement_actual_cents bigint,
  settlement_completed_at timestamptz,
  settlement_provider_ref text
)
language plpgsql
stable
security definer
set search_path = public, private
as $$
declare
  v_worker_id uuid;
begin
  v_worker_id := private.current_worker_id();
  if v_worker_id is null then
    raise exception 'Worker access required';
  end if;

  return query
  select
    t.swifttip_reference,
    t.gross_gratuity_cents,
    t.worker_fee_cents,
    t.worker_net_cents,
    t.currency,
    t.venue_name_snapshot,
    t.worker_role_snapshot,
    t.completed_at,
    pa.payment_state,
    pa.provider_completed_at,
    coalesce(s.settlement_state, 'pending')::text,
    s.expected_amount_cents,
    s.actual_amount_cents,
    s.completed_at,
    s.provider_settlement_ref
  from public.tips t
  left join lateral (
    select p.payment_state, p.provider_completed_at
    from public.payment_attempts p
    where p.tip_id = t.id
    order by case when p.payment_state = 'succeeded' then 0 else 1 end, p.created_at desc
    limit 1
  ) pa on true
  left join public.financial_allocations a
    on a.tip_id = t.id and a.allocation_type = 'worker_net'
  left join lateral (
    select se.settlement_state, se.expected_amount_cents, se.actual_amount_cents,
           se.completed_at, se.provider_settlement_ref
    from public.settlements se
    where se.allocation_id = a.id
    order by se.created_at desc
    limit 1
  ) s on true
  where t.worker_id = v_worker_id
    and t.swifttip_reference = p_reference
  limit 1;
end;
$$;
revoke all on function public.get_worker_tip_detail(text) from public;
grant execute on function public.get_worker_tip_detail(text) to authenticated;

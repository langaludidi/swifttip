-- SwiftTip MVP v3 — narrow surface projections for Worker and Venue applications

-- Workers may read the venue record to which their verified live association belongs.
-- This avoids requiring privileged server credentials merely to display their own work context.
create policy worker_associated_venue_read on public.venues for select to authenticated
using (
  exists (
    select 1
    from public.worker_venue_associations a
    where a.venue_id = venues.id
      and a.worker_id = private.current_worker_id()
      and a.association_status in ('pending','verified','suspended')
      and a.ended_at is null
  )
);

create or replace function public.get_worker_context()
returns table (
  worker_id uuid,
  display_name text,
  worker_status text,
  onboarding_status text,
  worker_role text,
  association_status text,
  venue_id uuid,
  venue_name text,
  venue_location text,
  public_token text,
  short_code text,
  endpoint_status text,
  settlement_readiness text,
  masked_destination text
)
language sql
stable
security definer
set search_path = public, private
as $$
  select
    w.id,
    w.display_first_name,
    w.worker_status,
    w.onboarding_status,
    a.worker_role,
    a.association_status,
    v.id,
    coalesce(v.branch_name, v.trading_name),
    coalesce(v.public_location_label, v.city),
    e.public_token,
    e.short_code,
    e.endpoint_status,
    s.settlement_readiness,
    s.masked_destination
  from public.workers w
  left join public.worker_venue_associations a
    on a.worker_id = w.id and a.ended_at is null
  left join public.venues v on v.id = a.venue_id
  left join public.worker_tipping_endpoints e
    on e.worker_id = w.id
    and e.worker_venue_association_id = a.id
    and e.endpoint_status = 'active'
  left join lateral (
    select ps.settlement_readiness, ps.masked_destination
    from public.provider_settlement_profiles ps
    where ps.worker_id = w.id and ps.disabled_at is null
    order by ps.updated_at desc
    limit 1
  ) s on true
  where w.user_id = auth.uid()
  order by case a.association_status when 'verified' then 0 when 'pending' then 1 else 2 end
  limit 1;
$$;
revoke all on function public.get_worker_context() from public;
grant execute on function public.get_worker_context() to authenticated;

create or replace function public.get_worker_summary(
  p_from timestamptz,
  p_to timestamptz
)
returns table (
  successful_tip_count bigint,
  gross_gratuity_cents bigint,
  worker_fee_cents bigint,
  worker_net_cents bigint,
  settled_cents bigint,
  processing_cents bigint
)
language sql
stable
security definer
set search_path = public, private
as $$
  with own_tips as (
    select t.id, t.gross_gratuity_cents, t.worker_fee_cents, t.worker_net_cents
    from public.tips t
    where t.worker_id = private.current_worker_id()
      and t.tip_status = 'completed'
      and t.completed_at >= p_from
      and t.completed_at < p_to
  ), settlement_totals as (
    select
      coalesce(sum(case when s.settlement_state = 'succeeded' then coalesce(s.actual_amount_cents, s.expected_amount_cents) else 0 end), 0)::bigint as settled,
      coalesce(sum(case when s.settlement_state in ('pending','processing','held') then s.expected_amount_cents else 0 end), 0)::bigint as processing
    from public.settlements s
    join public.financial_allocations a on a.id = s.allocation_id and a.allocation_type = 'worker_net'
    join own_tips ot on ot.id = a.tip_id
  )
  select
    count(ot.id)::bigint,
    coalesce(sum(ot.gross_gratuity_cents), 0)::bigint,
    coalesce(sum(ot.worker_fee_cents), 0)::bigint,
    coalesce(sum(ot.worker_net_cents), 0)::bigint,
    st.settled,
    st.processing
  from settlement_totals st
  left join own_tips ot on true
  group by st.settled, st.processing;
$$;
revoke all on function public.get_worker_summary(timestamptz,timestamptz) from public;
grant execute on function public.get_worker_summary(timestamptz,timestamptz) to authenticated;

-- Venue members get a narrow worker-participation projection. It deliberately omits
-- identity documents, phone numbers, settlement destinations, fees and individual earnings.
create or replace function public.get_venue_workers(p_venue_id uuid)
returns table (
  association_id uuid,
  worker_id uuid,
  display_name text,
  public_photo_path text,
  worker_role text,
  association_status text,
  worker_status text,
  associated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, private
as $$
begin
  if not private.user_has_venue_access(p_venue_id) then
    raise exception 'Venue access denied';
  end if;

  return query
  select
    a.id,
    w.id,
    w.display_first_name,
    w.public_photo_path,
    a.worker_role,
    a.association_status,
    w.worker_status,
    a.created_at
  from public.worker_venue_associations a
  join public.workers w on w.id = a.worker_id
  where a.venue_id = p_venue_id
    and a.association_status <> 'ended'
  order by w.display_first_name, a.created_at;
end;
$$;
revoke all on function public.get_venue_workers(uuid) from public;
grant execute on function public.get_venue_workers(uuid) to authenticated;

create or replace function public.get_venue_summary(
  p_venue_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
returns table (
  participating_workers bigint,
  active_workers bigint,
  successful_tip_count bigint,
  gross_gratuity_cents bigint
)
language plpgsql
stable
security definer
set search_path = public, private
as $$
begin
  if not private.user_has_venue_access(p_venue_id) then
    raise exception 'Venue access denied';
  end if;

  return query
  select
    (select count(*)::bigint from public.worker_venue_associations a where a.venue_id = p_venue_id and a.association_status in ('pending','verified','suspended')),
    (select count(*)::bigint from public.worker_venue_associations a join public.workers w on w.id = a.worker_id where a.venue_id = p_venue_id and a.association_status = 'verified' and w.worker_status = 'active'),
    (select count(*)::bigint from public.tips t where t.venue_id = p_venue_id and t.tip_status = 'completed' and t.completed_at >= p_from and t.completed_at < p_to),
    (select coalesce(sum(t.gross_gratuity_cents),0)::bigint from public.tips t where t.venue_id = p_venue_id and t.tip_status = 'completed' and t.completed_at >= p_from and t.completed_at < p_to);
end;
$$;
revoke all on function public.get_venue_summary(uuid,timestamptz,timestamptz) from public;
grant execute on function public.get_venue_summary(uuid,timestamptz,timestamptz) to authenticated;

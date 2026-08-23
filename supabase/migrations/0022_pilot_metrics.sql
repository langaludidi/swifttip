-- SwiftTip MVP v3 — pilot scorecard derived from canonical operational records.
-- Read-only. No customer tracking identifiers and no financial mutations.

create or replace function public.admin_get_pilot_metrics(
  p_from timestamptz,
  p_to timestamptz
)
returns table (
  successful_tip_count bigint,
  participating_venue_count bigint,
  active_worker_count bigint,
  gross_gratuity_cents bigint,
  swifttip_gross_revenue_cents bigint,
  provider_cost_cents bigint,
  contribution_cents bigint,
  average_gratuity_cents numeric,
  average_contribution_cents numeric,
  transactions_per_active_worker numeric,
  contribution_per_active_worker_cents numeric,
  settlement_record_count bigint,
  successful_settlement_count bigint,
  settlement_success_rate_pct numeric,
  refund_tip_count bigint,
  refund_rate_pct numeric,
  dispute_tip_count bigint,
  dispute_rate_pct numeric,
  support_case_count bigint,
  support_cases_per_100_tips numeric
)
language plpgsql
stable
security definer
set search_path = public, private
as $$
begin
  perform private.require_admin_role(array['operations_admin','finance_admin','super_admin']);
  if p_from is null or p_to is null or p_to <= p_from then
    raise exception 'A valid reporting window is required';
  end if;
  if p_to - p_from > interval '366 days' then
    raise exception 'Reporting window is too large';
  end if;

  return query
  with period_tips as (
    select t.id,t.worker_id,t.venue_id,t.gross_gratuity_cents,t.swifttip_gross_revenue_cents
    from public.tips t
    where t.tip_status='completed'
      and t.completed_at >= p_from
      and t.completed_at < p_to
  ),
  tip_rollup as (
    select count(*)::bigint as tips,
           count(distinct worker_id)::bigint as workers,
           count(distinct venue_id)::bigint as venues,
           coalesce(sum(gross_gratuity_cents),0)::bigint as gross,
           coalesce(sum(swifttip_gross_revenue_cents),0)::bigint as revenue
    from period_tips
  ),
  costs as (
    select coalesce(sum(pf.amount_cents),0)::bigint as amount
    from private.provider_fees pf
    join period_tips pt on pt.id=pf.tip_id
  ),
  settlement_rollup as (
    select count(s.id)::bigint as total,
           count(*) filter (where s.settlement_state='succeeded')::bigint as succeeded
    from period_tips pt
    join public.financial_allocations fa on fa.tip_id=pt.id and fa.allocation_type='worker_net'
    left join public.settlements s on s.allocation_id=fa.id
  ),
  refunds_rollup as (
    select count(distinct r.tip_id)::bigint as tips
    from public.refunds r join period_tips pt on pt.id=r.tip_id
    where r.refund_status in ('requested','under_review','approved','submitted','succeeded','failed')
  ),
  disputes_rollup as (
    select count(distinct d.tip_id)::bigint as tips
    from public.disputes d join period_tips pt on pt.id=d.tip_id
  ),
  support_rollup as (
    select count(*)::bigint as cases
    from public.support_cases s
    where s.created_at >= p_from and s.created_at < p_to
  )
  select
    tr.tips,
    tr.venues,
    tr.workers,
    tr.gross,
    tr.revenue,
    c.amount,
    (tr.revenue-c.amount)::bigint,
    case when tr.tips=0 then 0 else round(tr.gross::numeric/tr.tips,2) end,
    case when tr.tips=0 then 0 else round((tr.revenue-c.amount)::numeric/tr.tips,2) end,
    case when tr.workers=0 then 0 else round(tr.tips::numeric/tr.workers,2) end,
    case when tr.workers=0 then 0 else round((tr.revenue-c.amount)::numeric/tr.workers,2) end,
    sr.total,
    sr.succeeded,
    case when sr.total=0 then 0 else round(sr.succeeded::numeric*100/sr.total,2) end,
    rr.tips,
    case when tr.tips=0 then 0 else round(rr.tips::numeric*100/tr.tips,2) end,
    dr.tips,
    case when tr.tips=0 then 0 else round(dr.tips::numeric*100/tr.tips,2) end,
    su.cases,
    case when tr.tips=0 then 0 else round(su.cases::numeric*100/tr.tips,2) end
  from tip_rollup tr cross join costs c cross join settlement_rollup sr cross join refunds_rollup rr cross join disputes_rollup dr cross join support_rollup su;
end;
$$;

revoke all on function public.admin_get_pilot_metrics(timestamptz,timestamptz) from public, anon;
grant execute on function public.admin_get_pilot_metrics(timestamptz,timestamptz) to authenticated;

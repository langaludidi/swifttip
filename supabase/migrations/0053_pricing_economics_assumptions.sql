-- SwiftTip MVP v3 — auditable pricing economics assumptions.

create table public.pricing_economics_assumptions (
  pricing_version_id uuid primary key references public.pricing_versions(id) on delete cascade,
  provider_variable_bps integer not null default 0 check (provider_variable_bps between 0 and 10000),
  provider_fixed_cents bigint not null default 0 check (provider_fixed_cents >= 0),
  split_cost_cents bigint not null default 0 check (split_cost_cents >= 0),
  allocated_payout_cost_cents bigint not null default 0 check (allocated_payout_cost_cents >= 0),
  refund_chargeback_reserve_bps integer not null default 0 check (refund_chargeback_reserve_bps between 0 and 10000),
  support_reconciliation_cost_cents bigint not null default 0 check (support_reconciliation_cost_cents >= 0),
  evidence_reference text,
  assumption_notes text,
  updated_by_user_id uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

alter table public.pricing_economics_assumptions enable row level security;
revoke all on table public.pricing_economics_assumptions from public, anon, authenticated;

create function public.admin_get_pricing_economics(p_pricing_version_id uuid)
returns table (
  pricing_version_id uuid,
  provider_variable_bps integer,
  provider_fixed_cents bigint,
  split_cost_cents bigint,
  allocated_payout_cost_cents bigint,
  refund_chargeback_reserve_bps integer,
  support_reconciliation_cost_cents bigint,
  evidence_reference text,
  assumption_notes text,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_admin_role(array['operations_admin','finance_admin','super_admin']);
  return query
  select e.pricing_version_id,e.provider_variable_bps,e.provider_fixed_cents,e.split_cost_cents,
         e.allocated_payout_cost_cents,e.refund_chargeback_reserve_bps,e.support_reconciliation_cost_cents,
         e.evidence_reference,e.assumption_notes,e.updated_at
  from public.pricing_economics_assumptions e
  where e.pricing_version_id=p_pricing_version_id;
end;
$$;

create function public.admin_save_pricing_economics(
  p_pricing_version_id uuid,
  p_provider_variable_bps integer,
  p_provider_fixed_cents bigint,
  p_split_cost_cents bigint,
  p_allocated_payout_cost_cents bigint,
  p_refund_chargeback_reserve_bps integer,
  p_support_reconciliation_cost_cents bigint,
  p_evidence_reference text,
  p_assumption_notes text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_previous jsonb;
begin
  perform private.require_admin_role(array['finance_admin','super_admin']);
  if p_provider_variable_bps not between 0 and 10000 or p_refund_chargeback_reserve_bps not between 0 and 10000 then
    raise exception 'Cost basis points must be between 0 and 10000';
  end if;
  if least(p_provider_fixed_cents,p_split_cost_cents,p_allocated_payout_cost_cents,p_support_reconciliation_cost_cents) < 0 then
    raise exception 'Cost assumptions cannot be negative';
  end if;
  if not exists(select 1 from public.pricing_versions p where p.id=p_pricing_version_id and p.pricing_status='draft' and p.review_status='draft') then
    raise exception 'Economics assumptions may only be edited for pricing in working draft';
  end if;
  select to_jsonb(e) into v_previous from public.pricing_economics_assumptions e where e.pricing_version_id=p_pricing_version_id;
  insert into public.pricing_economics_assumptions(
    pricing_version_id,provider_variable_bps,provider_fixed_cents,split_cost_cents,allocated_payout_cost_cents,
    refund_chargeback_reserve_bps,support_reconciliation_cost_cents,evidence_reference,assumption_notes,updated_by_user_id,updated_at
  ) values (
    p_pricing_version_id,p_provider_variable_bps,p_provider_fixed_cents,p_split_cost_cents,p_allocated_payout_cost_cents,
    p_refund_chargeback_reserve_bps,p_support_reconciliation_cost_cents,nullif(trim(p_evidence_reference),''),nullif(trim(p_assumption_notes),''),auth.uid(),now()
  ) on conflict (pricing_version_id) do update set
    provider_variable_bps=excluded.provider_variable_bps,provider_fixed_cents=excluded.provider_fixed_cents,
    split_cost_cents=excluded.split_cost_cents,allocated_payout_cost_cents=excluded.allocated_payout_cost_cents,
    refund_chargeback_reserve_bps=excluded.refund_chargeback_reserve_bps,
    support_reconciliation_cost_cents=excluded.support_reconciliation_cost_cents,
    evidence_reference=excluded.evidence_reference,assumption_notes=excluded.assumption_notes,
    updated_by_user_id=auth.uid(),updated_at=now();
  insert into audit.audit_events(actor_type,actor_user_id,actor_role,action,entity_type,entity_id,previous_state,resulting_state)
  select 'admin',auth.uid(),private.current_admin_role(),'pricing_economics_saved','pricing_version',p_pricing_version_id,v_previous,
         to_jsonb(e)-'updated_by_user_id'
  from public.pricing_economics_assumptions e where e.pricing_version_id=p_pricing_version_id;
end;
$$;

revoke all on function public.admin_get_pricing_economics(uuid) from public, anon, authenticated;
revoke all on function public.admin_save_pricing_economics(uuid,integer,bigint,bigint,bigint,integer,bigint,text,text) from public, anon, authenticated;
grant execute on function public.admin_get_pricing_economics(uuid) to authenticated;
grant execute on function public.admin_save_pricing_economics(uuid,integer,bigint,bigint,bigint,integer,bigint,text,text) to authenticated;

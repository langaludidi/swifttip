-- SwiftTip MVP v3 — read-only Refund and Dispute operations projections.
-- No mutation/submit-to-provider actions are introduced before provider/refund policy approval.

create or replace function public.admin_get_refund_queue(p_limit integer default 50)
returns table(
  refund_id uuid,
  swifttip_reference text,
  worker_display_name text,
  venue_name text,
  requested_amount_cents bigint,
  approved_amount_cents bigint,
  refund_status text,
  refund_reason text,
  requested_at timestamptz,
  reviewed_at timestamptz,
  completed_at timestamptz,
  provider_refund_ref text
)
language plpgsql
stable
security definer
set search_path = public, private
as $$
begin
  perform private.require_admin_role(array['operations_admin','finance_admin','super_admin']);
  return query
  select r.id,t.swifttip_reference,t.worker_display_name_snapshot,t.venue_name_snapshot,
         r.requested_amount_cents,r.approved_amount_cents,r.refund_status,r.refund_reason,
         r.requested_at,r.reviewed_at,r.completed_at,r.provider_refund_ref
  from public.refunds r
  join public.tips t on t.id=r.tip_id
  order by case r.refund_status when 'requested' then 0 when 'under_review' then 1 when 'approved' then 2 when 'submitted' then 3 when 'failed' then 4 else 5 end,
           r.requested_at asc
  limit greatest(1,least(coalesce(p_limit,50),100));
end;
$$;

create or replace function public.admin_get_refund_detail(p_refund_id uuid)
returns table(
  refund_id uuid,
  tip_id uuid,
  payment_attempt_id uuid,
  swifttip_reference text,
  worker_display_name text,
  venue_name text,
  gross_gratuity_cents bigint,
  customer_fee_cents bigint,
  customer_total_cents bigint,
  worker_fee_cents bigint,
  worker_net_cents bigint,
  requested_amount_cents bigint,
  approved_amount_cents bigint,
  refund_status text,
  refund_reason text,
  provider_refund_ref text,
  requested_at timestamptz,
  reviewed_at timestamptz,
  submitted_at timestamptz,
  completed_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, private
as $$
begin
  perform private.require_admin_role(array['operations_admin','finance_admin','super_admin']);
  return query
  select r.id,r.tip_id,r.payment_attempt_id,t.swifttip_reference,t.worker_display_name_snapshot,t.venue_name_snapshot,
         t.gross_gratuity_cents,t.customer_fee_cents,t.customer_total_cents,t.worker_fee_cents,t.worker_net_cents,
         r.requested_amount_cents,r.approved_amount_cents,r.refund_status,r.refund_reason,r.provider_refund_ref,
         r.requested_at,r.reviewed_at,r.submitted_at,r.completed_at
  from public.refunds r join public.tips t on t.id=r.tip_id
  where r.id=p_refund_id;
end;
$$;

create or replace function public.admin_get_dispute_queue(p_limit integer default 50)
returns table(
  dispute_id uuid,
  swifttip_reference text,
  worker_display_name text,
  venue_name text,
  disputed_amount_cents bigint,
  dispute_status text,
  dispute_reason text,
  provider_dispute_ref text,
  opened_at timestamptz,
  evidence_due_at timestamptz,
  resolved_at timestamptz,
  financial_outcome_cents bigint
)
language plpgsql
stable
security definer
set search_path = public, private
as $$
begin
  perform private.require_admin_role(array['operations_admin','finance_admin','super_admin']);
  return query
  select d.id,t.swifttip_reference,t.worker_display_name_snapshot,t.venue_name_snapshot,
         d.disputed_amount_cents,d.dispute_status,d.dispute_reason,d.provider_dispute_ref,
         d.opened_at,d.evidence_due_at,d.resolved_at,d.financial_outcome_cents
  from public.disputes d join public.tips t on t.id=d.tip_id
  order by case d.dispute_status when 'evidence_required' then 0 when 'open' then 1 when 'evidence_submitted' then 2 else 3 end,
           coalesce(d.evidence_due_at,d.opened_at) asc
  limit greatest(1,least(coalesce(p_limit,50),100));
end;
$$;

create or replace function public.admin_get_dispute_detail(p_dispute_id uuid)
returns table(
  dispute_id uuid,
  tip_id uuid,
  payment_attempt_id uuid,
  swifttip_reference text,
  worker_display_name text,
  venue_name text,
  gross_gratuity_cents bigint,
  customer_total_cents bigint,
  worker_net_cents bigint,
  disputed_amount_cents bigint,
  dispute_status text,
  dispute_reason text,
  provider_code text,
  provider_dispute_ref text,
  opened_at timestamptz,
  evidence_due_at timestamptz,
  evidence_submitted_at timestamptz,
  resolved_at timestamptz,
  financial_outcome_cents bigint,
  worker_settlement_state text,
  worker_settlement_completed_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, private
as $$
begin
  perform private.require_admin_role(array['operations_admin','finance_admin','super_admin']);
  return query
  select d.id,d.tip_id,d.payment_attempt_id,t.swifttip_reference,t.worker_display_name_snapshot,t.venue_name_snapshot,
         t.gross_gratuity_cents,t.customer_total_cents,t.worker_net_cents,d.disputed_amount_cents,d.dispute_status,d.dispute_reason,
         d.provider_code,d.provider_dispute_ref,d.opened_at,d.evidence_due_at,d.evidence_submitted_at,d.resolved_at,d.financial_outcome_cents,
         s.settlement_state,s.completed_at
  from public.disputes d
  join public.tips t on t.id=d.tip_id
  left join public.financial_allocations fa on fa.tip_id=t.id and fa.allocation_type='worker_net'
  left join public.settlements s on s.allocation_id=fa.id
  where d.id=p_dispute_id
  order by s.created_at desc nulls last
  limit 1;
end;
$$;

revoke all on function public.admin_get_refund_queue(integer) from public,anon;
revoke all on function public.admin_get_refund_detail(uuid) from public,anon;
revoke all on function public.admin_get_dispute_queue(integer) from public,anon;
revoke all on function public.admin_get_dispute_detail(uuid) from public,anon;
grant execute on function public.admin_get_refund_queue(integer) to authenticated;
grant execute on function public.admin_get_refund_detail(uuid) to authenticated;
grant execute on function public.admin_get_dispute_queue(integer) to authenticated;
grant execute on function public.admin_get_dispute_detail(uuid) to authenticated;

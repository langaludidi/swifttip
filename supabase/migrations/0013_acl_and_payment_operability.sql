-- SwiftTip MVP v3 — explicit RPC ACLs and operative payment-attempt model

-- Supabase may provision explicit anon/authenticated EXECUTE grants on functions in
-- the exposed public schema. Remove anonymous execution from every authenticated
-- Worker, Venue and Admin RPC. The four customer entry RPCs remain intentionally
-- callable by anon.
revoke execute on function public.get_worker_context() from anon;
revoke execute on function public.get_worker_summary(timestamptz,timestamptz) from anon;
revoke execute on function public.get_worker_recent_tips(integer) from anon;
revoke execute on function public.get_worker_tip_detail(text) from anon;
revoke execute on function public.get_venue_workers(uuid) from anon;
revoke execute on function public.get_venue_summary(uuid,timestamptz,timestamptz) from anon;
revoke execute on function public.decide_worker_venue_association(uuid,text,text) from anon;
revoke execute on function public.end_worker_venue_association(uuid,text) from anon;
revoke execute on function public.admin_get_dashboard() from anon;
revoke execute on function public.admin_get_recent_transactions(integer) from anon;
revoke execute on function public.admin_get_transaction_detail(text) from anon;
revoke execute on function public.admin_get_settlement_exceptions(integer) from anon;
revoke execute on function public.admin_get_verification_queue(integer) from anon;

-- A provider can genuinely confirm more than one payment attempt for the same Tip.
-- Preserve all successful provider facts, but designate exactly one attempt as the
-- economic event that establishes allocations and expected Worker settlement.
alter table public.tips
  add column operative_payment_attempt_id uuid;

alter table public.payment_attempts
  add constraint payment_attempts_id_tip_unique unique (id, tip_id);

alter table public.tips
  add constraint tips_operative_payment_attempt_fk
  foreign key (operative_payment_attempt_id, id)
  references public.payment_attempts(id, tip_id)
  on delete restrict;

drop index if exists public.one_successful_payment_per_tip_idx;
create index payment_attempts_successful_tip_idx
  on public.payment_attempts(tip_id, created_at)
  where payment_state = 'succeeded';

create or replace function private.protect_tip_financial_snapshot()
returns trigger
language plpgsql
set search_path = public, private
as $$
begin
  if old.tip_status = 'completed' then
    if new.worker_id is distinct from old.worker_id
      or new.venue_id is distinct from old.venue_id
      or new.worker_venue_association_id is distinct from old.worker_venue_association_id
      or new.tipping_endpoint_id is distinct from old.tipping_endpoint_id
      or new.pricing_version_id is distinct from old.pricing_version_id
      or new.operative_payment_attempt_id is distinct from old.operative_payment_attempt_id
      or new.currency is distinct from old.currency
      or new.gross_gratuity_cents is distinct from old.gross_gratuity_cents
      or new.customer_fee_cents is distinct from old.customer_fee_cents
      or new.customer_total_cents is distinct from old.customer_total_cents
      or new.worker_fee_cents is distinct from old.worker_fee_cents
      or new.worker_net_cents is distinct from old.worker_net_cents
      or new.swifttip_gross_revenue_cents is distinct from old.swifttip_gross_revenue_cents
      or new.worker_display_name_snapshot is distinct from old.worker_display_name_snapshot
      or new.worker_role_snapshot is distinct from old.worker_role_snapshot
      or new.venue_name_snapshot is distinct from old.venue_name_snapshot then
      raise exception 'Completed tip financial snapshot is immutable';
    end if;
  end if;
  return new;
end;
$$;

create or replace function private.apply_payment_success(
  p_payment_attempt_id uuid,
  p_webhook_receipt_id uuid,
  p_provider_event_at timestamptz default now()
)
returns void
language plpgsql
security definer
set search_path = public, private, audit
as $$
declare
  v_attempt public.payment_attempts;
  v_tip public.tips;
  v_worker_allocation public.financial_allocations;
  v_profile public.provider_settlement_profiles;
begin
  select * into strict v_attempt
  from public.payment_attempts
  where id = p_payment_attempt_id
  for update;

  select * into strict v_tip
  from public.tips
  where id = v_attempt.tip_id
  for update;

  if p_webhook_receipt_id is not null and exists (
    select 1
    from private.payment_events pe
    where pe.payment_attempt_id = v_attempt.id
      and pe.webhook_receipt_id = p_webhook_receipt_id
  ) then
    return;
  end if;

  if v_attempt.payment_state = 'succeeded' then
    return;
  end if;

  if v_attempt.payment_state not in ('created','pending') then
    raise exception 'Invalid payment transition from %', v_attempt.payment_state;
  end if;

  if v_attempt.requested_amount_cents <> v_tip.customer_total_cents then
    raise exception 'Provider payment amount does not match canonical tip total';
  end if;

  update public.payment_attempts
  set payment_state = 'succeeded',
      provider_completed_at = p_provider_event_at
  where id = v_attempt.id;

  -- A prior successful attempt already established the Tip economics. Record this
  -- second provider success as an exception, but never create a second allocation.
  if v_tip.operative_payment_attempt_id is not null
     and v_tip.operative_payment_attempt_id <> v_attempt.id then
    insert into private.payment_events(
      payment_attempt_id, webhook_receipt_id, event_type,
      event_amount_cents, provider_event_at, evidence_source
    ) values (
      v_attempt.id, p_webhook_receipt_id, 'duplicate_payment_succeeded',
      v_attempt.requested_amount_cents, p_provider_event_at, 'webhook'
    );

    insert into private.reconciliation_records(
      tip_id, reconciliation_type, expected_amount_cents, actual_amount_cents,
      difference_cents, reconciliation_status, evidence_source,
      evidence_reference, checked_at
    ) values (
      v_tip.id,
      'overall_transaction',
      v_tip.customer_total_cents,
      v_tip.customer_total_cents + v_attempt.requested_amount_cents,
      v_attempt.requested_amount_cents,
      'exception',
      'provider_webhook',
      v_attempt.provider_payment_ref,
      now()
    );
    return;
  end if;

  update public.tips
  set tip_status = 'completed',
      completed_at = p_provider_event_at,
      operative_payment_attempt_id = v_attempt.id
  where id = v_tip.id;

  insert into private.payment_events(
    payment_attempt_id, webhook_receipt_id, event_type,
    event_amount_cents, provider_event_at, evidence_source
  ) values (
    v_attempt.id, p_webhook_receipt_id, 'payment_succeeded',
    v_attempt.requested_amount_cents, p_provider_event_at, 'webhook'
  );

  insert into public.financial_allocations(
    tip_id, allocation_type, beneficiary_type, worker_id,
    amount_cents, currency, allocation_status
  ) values (
    v_tip.id, 'worker_net', 'worker', v_tip.worker_id,
    v_tip.worker_net_cents, v_tip.currency, 'confirmed'
  )
  on conflict (tip_id, allocation_type) do nothing
  returning * into v_worker_allocation;

  if v_worker_allocation.id is null then
    select * into strict v_worker_allocation
    from public.financial_allocations
    where tip_id = v_tip.id and allocation_type = 'worker_net';
  end if;

  insert into public.financial_allocations(
    tip_id, allocation_type, beneficiary_type,
    amount_cents, currency, allocation_status
  ) values (
    v_tip.id, 'swifttip_worker_fee', 'swifttip',
    v_tip.worker_fee_cents, v_tip.currency, 'confirmed'
  ) on conflict (tip_id, allocation_type) do nothing;

  insert into public.financial_allocations(
    tip_id, allocation_type, beneficiary_type,
    amount_cents, currency, allocation_status
  ) values (
    v_tip.id, 'swifttip_customer_fee', 'swifttip',
    v_tip.customer_fee_cents, v_tip.currency, 'confirmed'
  ) on conflict (tip_id, allocation_type) do nothing;

  select * into strict v_profile
  from public.provider_settlement_profiles
  where worker_id = v_tip.worker_id
    and provider_code = v_attempt.provider_code
    and settlement_readiness = 'ready'
    and disabled_at is null
  limit 1;

  if not exists (
    select 1 from public.settlements
    where allocation_id = v_worker_allocation.id
      and settlement_state <> 'reversed'
  ) then
    insert into public.settlements(
      allocation_id, provider_code, settlement_profile_id,
      settlement_state, expected_amount_cents, currency
    ) values (
      v_worker_allocation.id, v_attempt.provider_code, v_profile.id,
      'pending', v_tip.worker_net_cents, v_tip.currency
    );
  end if;

  insert into private.reconciliation_records(
    tip_id, reconciliation_type, expected_amount_cents, actual_amount_cents,
    difference_cents, reconciliation_status, evidence_source, checked_at
  ) values (
    v_tip.id, 'customer_collection', v_tip.customer_total_cents,
    v_attempt.requested_amount_cents, 0, 'reconciled',
    'provider_webhook', now()
  );
end;
$$;

revoke all on function private.apply_payment_success(uuid,uuid,timestamptz) from public, anon, authenticated;

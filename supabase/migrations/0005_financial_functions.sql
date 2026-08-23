-- Canonical anonymous tip creation. This creates intent only; it never marks payment or settlement successful.
create or replace function public.create_tip(
  p_public_token text,
  p_gross_gratuity_cents bigint,
  p_idempotency_key text
)
returns table (
  tip_id uuid,
  swifttip_reference text,
  expires_at timestamptz,
  gross_gratuity_cents bigint,
  customer_fee_cents bigint,
  customer_total_cents bigint,
  worker_fee_cents bigint,
  worker_net_cents bigint,
  currency char(3)
)
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_existing_resource uuid;
  v_request_hash text;
  v_endpoint public.worker_tipping_endpoints;
  v_worker public.workers;
  v_assoc public.worker_venue_associations;
  v_venue public.venues;
  v_settlement public.provider_settlement_profiles;
  v_pricing public.pricing_versions;
  v_terms public.terms_versions;
  v_worker_fee bigint;
  v_customer_fee bigint;
  v_tip public.tips;
  v_reference text;
begin
  if length(trim(p_idempotency_key)) < 8 then
    raise exception 'Idempotency key is required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('create_tip:' || p_idempotency_key, 0));

  v_request_hash := encode(digest(p_public_token || ':' || p_gross_gratuity_cents::text, 'sha256'), 'hex');

  select resource_id into v_existing_resource
  from private.idempotency_keys
  where operation = 'create_tip' and idempotency_key = p_idempotency_key;

  if v_existing_resource is not null then
    if exists (
      select 1 from private.idempotency_keys
      where operation = 'create_tip' and idempotency_key = p_idempotency_key and request_hash <> v_request_hash
    ) then
      raise exception 'Idempotency key reused with different request';
    end if;
    select * into strict v_tip from public.tips where id = v_existing_resource;
    return query select v_tip.id, v_tip.swifttip_reference, v_tip.expires_at,
      v_tip.gross_gratuity_cents, v_tip.customer_fee_cents, v_tip.customer_total_cents,
      v_tip.worker_fee_cents, v_tip.worker_net_cents, v_tip.currency;
    return;
  end if;

  select * into strict v_endpoint
  from public.worker_tipping_endpoints e
  where e.public_token = p_public_token and e.endpoint_status = 'active';

  select * into strict v_worker from public.workers where id = v_endpoint.worker_id and worker_status = 'active';
  select * into strict v_assoc from public.worker_venue_associations where id = v_endpoint.worker_venue_association_id and association_status = 'verified';
  select * into strict v_venue from public.venues where id = v_assoc.venue_id and venue_status = 'active';
  select * into strict v_settlement
  from public.provider_settlement_profiles s
  where s.worker_id = v_worker.id and s.settlement_readiness = 'ready' and s.disabled_at is null
  limit 1;

  if not exists (
    select 1
    from public.terms_acceptances ta
    join public.terms_versions tv on tv.id = ta.terms_version_id
    where ta.subject_type = 'worker' and ta.subject_id = v_worker.id
      and tv.terms_type = 'worker_terms' and tv.effective_from <= now()
      and (tv.retired_at is null or tv.retired_at > now())
  ) then
    raise exception 'Worker terms not accepted';
  end if;

  v_pricing := private.get_active_pricing(now());
  if p_gross_gratuity_cents < v_pricing.minimum_gratuity_cents or p_gross_gratuity_cents > v_pricing.maximum_gratuity_cents then
    raise exception 'Gratuity outside configured range';
  end if;

  select * into strict v_terms
  from public.terms_versions tv
  where tv.terms_type = 'customer_transaction_terms'
    and tv.effective_from <= now()
    and (tv.retired_at is null or tv.retired_at > now())
  order by tv.effective_from desc
  limit 1;

  v_worker_fee := private.percent_cents(p_gross_gratuity_cents, v_pricing.worker_fee_bps);
  v_customer_fee := v_pricing.customer_fixed_fee_cents + private.percent_cents(p_gross_gratuity_cents, v_pricing.customer_fee_bps);
  if v_pricing.customer_fee_cap_cents is not null then
    v_customer_fee := least(v_customer_fee, v_pricing.customer_fee_cap_cents);
  end if;

  loop
    v_reference := 'ST-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
    exit when not exists (select 1 from public.tips where swifttip_reference = v_reference);
  end loop;

  insert into public.tips (
    swifttip_reference, worker_id, venue_id, worker_venue_association_id, tipping_endpoint_id,
    pricing_version_id, tip_status, currency, gross_gratuity_cents, customer_fee_cents,
    customer_total_cents, worker_fee_cents, worker_net_cents, swifttip_gross_revenue_cents,
    worker_display_name_snapshot, worker_role_snapshot, venue_name_snapshot,
    customer_terms_version_id, client_idempotency_key, expires_at
  ) values (
    v_reference, v_worker.id, v_venue.id, v_assoc.id, v_endpoint.id,
    v_pricing.id, 'created', v_pricing.currency, p_gross_gratuity_cents, v_customer_fee,
    p_gross_gratuity_cents + v_customer_fee, v_worker_fee, p_gross_gratuity_cents - v_worker_fee,
    v_customer_fee + v_worker_fee, v_worker.display_first_name, v_assoc.worker_role,
    coalesce(v_venue.branch_name, v_venue.trading_name), v_terms.id, p_idempotency_key,
    now() + interval '15 minutes'
  ) returning * into v_tip;

  insert into private.idempotency_keys(operation, idempotency_key, request_hash, resource_type, resource_id, response_code)
  values ('create_tip', p_idempotency_key, v_request_hash, 'tip', v_tip.id, 201);

  insert into public.terms_acceptances(terms_version_id, subject_type, subject_id, tip_id, acceptance_method, evidence_metadata)
  values (v_terms.id, 'customer_transaction', null, v_tip.id, 'transaction_creation', jsonb_build_object('pricing_version_id', v_pricing.id));

  return query select v_tip.id, v_tip.swifttip_reference, v_tip.expires_at,
    v_tip.gross_gratuity_cents, v_tip.customer_fee_cents, v_tip.customer_total_cents,
    v_tip.worker_fee_cents, v_tip.worker_net_cents, v_tip.currency;
end;
$$;
revoke all on function public.create_tip(text,bigint,text) from public;
grant execute on function public.create_tip(text,bigint,text) to anon, authenticated;

-- Internal: provider-authenticated server path only. No grants to anon/authenticated.
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
  select * into strict v_attempt from public.payment_attempts where id = p_payment_attempt_id for update;
  select * into strict v_tip from public.tips where id = v_attempt.tip_id for update;

  if v_attempt.payment_state = 'succeeded' then return; end if;
  if v_attempt.payment_state not in ('created','pending') then
    raise exception 'Invalid payment transition from %', v_attempt.payment_state;
  end if;
  if v_attempt.requested_amount_cents <> v_tip.customer_total_cents then
    raise exception 'Provider payment amount does not match canonical tip total';
  end if;

  update public.payment_attempts
    set payment_state = 'succeeded', provider_completed_at = p_provider_event_at
    where id = v_attempt.id;
  update public.tips
    set tip_status = 'completed', completed_at = p_provider_event_at
    where id = v_tip.id;

  insert into private.payment_events(payment_attempt_id, webhook_receipt_id, event_type, event_amount_cents, provider_event_at, evidence_source)
  values (v_attempt.id, p_webhook_receipt_id, 'payment_succeeded', v_attempt.requested_amount_cents, p_provider_event_at, 'webhook');

  insert into public.financial_allocations(tip_id, allocation_type, beneficiary_type, worker_id, amount_cents, currency, allocation_status)
  values (v_tip.id, 'worker_net', 'worker', v_tip.worker_id, v_tip.worker_net_cents, v_tip.currency, 'confirmed')
  on conflict (tip_id, allocation_type) do nothing
  returning * into v_worker_allocation;

  if v_worker_allocation.id is null then
    select * into strict v_worker_allocation from public.financial_allocations where tip_id = v_tip.id and allocation_type = 'worker_net';
  end if;

  insert into public.financial_allocations(tip_id, allocation_type, beneficiary_type, amount_cents, currency, allocation_status)
  values (v_tip.id, 'swifttip_worker_fee', 'swifttip', v_tip.worker_fee_cents, v_tip.currency, 'confirmed')
  on conflict (tip_id, allocation_type) do nothing;

  insert into public.financial_allocations(tip_id, allocation_type, beneficiary_type, amount_cents, currency, allocation_status)
  values (v_tip.id, 'swifttip_customer_fee', 'swifttip', v_tip.customer_fee_cents, v_tip.currency, 'confirmed')
  on conflict (tip_id, allocation_type) do nothing;

  select * into strict v_profile
  from public.provider_settlement_profiles
  where worker_id = v_tip.worker_id and provider_code = v_attempt.provider_code
    and settlement_readiness = 'ready' and disabled_at is null
  limit 1;

  if not exists (select 1 from public.settlements where allocation_id = v_worker_allocation.id and settlement_state <> 'reversed') then
    insert into public.settlements(allocation_id, provider_code, settlement_profile_id, settlement_state, expected_amount_cents, currency)
    values (v_worker_allocation.id, v_attempt.provider_code, v_profile.id, 'pending', v_tip.worker_net_cents, v_tip.currency);
  end if;

  insert into private.reconciliation_records(tip_id, reconciliation_type, expected_amount_cents, actual_amount_cents, difference_cents, reconciliation_status, evidence_source, checked_at)
  values (v_tip.id, 'customer_collection', v_tip.customer_total_cents, v_attempt.requested_amount_cents, 0, 'reconciled', 'provider_webhook', now());
end;
$$;

create or replace function private.apply_settlement_success(
  p_settlement_id uuid,
  p_actual_amount_cents bigint,
  p_provider_settlement_ref text,
  p_webhook_receipt_id uuid,
  p_provider_event_at timestamptz default now()
)
returns void
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_settlement public.settlements;
  v_tip_id uuid;
  v_status text;
begin
  select * into strict v_settlement from public.settlements where id = p_settlement_id for update;
  select tip_id into strict v_tip_id from public.financial_allocations where id = v_settlement.allocation_id;

  insert into private.settlement_events(settlement_id, webhook_receipt_id, event_type, amount_cents, provider_event_at, evidence_source)
  values (v_settlement.id, p_webhook_receipt_id, 'settlement_succeeded', p_actual_amount_cents, p_provider_event_at, 'webhook');

  if p_actual_amount_cents = v_settlement.expected_amount_cents then v_status := 'succeeded'; else v_status := 'exception'; end if;

  update public.settlements
  set settlement_state = v_status,
      actual_amount_cents = p_actual_amount_cents,
      provider_settlement_ref = coalesce(provider_settlement_ref, p_provider_settlement_ref),
      completed_at = p_provider_event_at
  where id = v_settlement.id;

  insert into private.reconciliation_records(tip_id, reconciliation_type, expected_amount_cents, actual_amount_cents, difference_cents, reconciliation_status, evidence_source, evidence_reference, checked_at)
  values (
    v_tip_id, 'worker_settlement', v_settlement.expected_amount_cents, p_actual_amount_cents,
    p_actual_amount_cents - v_settlement.expected_amount_cents,
    case when p_actual_amount_cents = v_settlement.expected_amount_cents then 'reconciled' else 'exception' end,
    'provider_webhook', p_provider_settlement_ref, now()
  );
end;
$$;

revoke all on function private.apply_payment_success(uuid,uuid,timestamptz) from public, anon, authenticated;
revoke all on function private.apply_settlement_success(uuid,bigint,text,uuid,timestamptz) from public, anon, authenticated;

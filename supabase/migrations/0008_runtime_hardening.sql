-- SwiftTip MVP v3 — runtime hardening before first database application

-- Short codes are intentionally separate from long public QR tokens. This resolver
-- reveals only the long token of an endpoint that is currently tip-eligible.
create or replace function public.resolve_short_code(p_short_code text)
returns text
language sql
stable
security definer
set search_path = public, private
as $$
  select e.public_token
  from public.worker_tipping_endpoints e
  join public.workers w on w.id = e.worker_id
  join public.worker_venue_associations a on a.id = e.worker_venue_association_id
  join public.venues v on v.id = a.venue_id
  where upper(e.short_code) = upper(trim(p_short_code))
    and e.endpoint_status = 'active'
    and w.worker_status = 'active'
    and a.association_status = 'verified'
    and v.venue_status = 'active'
    and exists (
      select 1
      from public.provider_settlement_profiles s
      where s.worker_id = w.id
        and s.settlement_readiness = 'ready'
        and s.disabled_at is null
    )
    and exists (
      select 1
      from public.terms_acceptances ta
      join public.terms_versions tv on tv.id = ta.terms_version_id
      where ta.subject_type = 'worker'
        and ta.subject_id = w.id
        and tv.terms_type = 'worker_terms'
        and tv.effective_from <= now()
        and (tv.retired_at is null or tv.retired_at > now())
    )
  limit 1;
$$;
revoke all on function public.resolve_short_code(text) from public;
grant execute on function public.resolve_short_code(text) to anon, authenticated;

-- A provider webhook receipt may affect a given financial object at most once.
create unique index if not exists payment_events_webhook_once_idx
  on private.payment_events(payment_attempt_id, webhook_receipt_id)
  where webhook_receipt_id is not null;

create unique index if not exists settlement_events_webhook_once_idx
  on private.settlement_events(settlement_id, webhook_receipt_id)
  where webhook_receipt_id is not null;

-- Settlement success must be replay-safe even if application-level event handling
-- is accidentally invoked more than once.
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
  if p_actual_amount_cents < 0 then
    raise exception 'Settlement amount cannot be negative';
  end if;

  select * into strict v_settlement
  from public.settlements
  where id = p_settlement_id
  for update;

  select tip_id into strict v_tip_id
  from public.financial_allocations
  where id = v_settlement.allocation_id;

  if p_webhook_receipt_id is not null and exists (
    select 1
    from private.settlement_events se
    where se.settlement_id = v_settlement.id
      and se.webhook_receipt_id = p_webhook_receipt_id
  ) then
    return;
  end if;

  if v_settlement.settlement_state = 'reversed' then
    raise exception 'Reversed settlement cannot transition to success';
  end if;

  -- Exact provider replays after a final state have no additional consequence.
  if v_settlement.settlement_state in ('succeeded','exception')
     and v_settlement.actual_amount_cents = p_actual_amount_cents
     and (v_settlement.provider_settlement_ref is null or v_settlement.provider_settlement_ref = p_provider_settlement_ref) then
    return;
  end if;

  -- A previously reconciled success cannot silently change value later.
  if v_settlement.settlement_state = 'succeeded'
     and v_settlement.actual_amount_cents is distinct from p_actual_amount_cents then
    raise exception 'Conflicting settlement success amount';
  end if;

  insert into private.settlement_events(
    settlement_id, webhook_receipt_id, event_type, amount_cents,
    provider_event_at, evidence_source
  ) values (
    v_settlement.id, p_webhook_receipt_id, 'settlement_succeeded',
    p_actual_amount_cents, p_provider_event_at, 'webhook'
  );

  if p_actual_amount_cents = v_settlement.expected_amount_cents then
    v_status := 'succeeded';
  else
    v_status := 'exception';
  end if;

  update public.settlements
  set settlement_state = v_status,
      actual_amount_cents = p_actual_amount_cents,
      provider_settlement_ref = coalesce(provider_settlement_ref, p_provider_settlement_ref),
      completed_at = p_provider_event_at
  where id = v_settlement.id;

  insert into private.reconciliation_records(
    tip_id, reconciliation_type, expected_amount_cents, actual_amount_cents,
    difference_cents, reconciliation_status, evidence_source,
    evidence_reference, checked_at
  ) values (
    v_tip_id,
    'worker_settlement',
    v_settlement.expected_amount_cents,
    p_actual_amount_cents,
    p_actual_amount_cents - v_settlement.expected_amount_cents,
    case when p_actual_amount_cents = v_settlement.expected_amount_cents then 'reconciled' else 'exception' end,
    'provider_webhook',
    p_provider_settlement_ref,
    now()
  );
end;
$$;

revoke all on function private.apply_settlement_success(uuid,bigint,text,uuid,timestamptz) from public, anon, authenticated;

-- SwiftTip MVP v3 — make current published Terms an explicit customer-facing eligibility invariant.
-- A Worker must have accepted the current effective published Worker Terms version.
-- A Tip may only snapshot the current effective published Customer Transaction Terms.

create or replace function private.worker_has_current_terms_acceptance(
  p_worker_id uuid,
  p_at timestamptz default now()
)
returns boolean
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
  with current_terms as (
    select tv.id
    from public.terms_versions tv
    where tv.terms_type = 'worker_terms'
      and tv.published_at is not null
      and tv.published_at <= p_at
      and tv.effective_from <= p_at
      and (tv.retired_at is null or tv.retired_at > p_at)
    order by tv.effective_from desc, tv.published_at desc
    limit 1
  )
  select exists (
    select 1
    from current_terms ct
    join public.terms_acceptances ta
      on ta.terms_version_id = ct.id
     and ta.subject_type = 'worker'
     and ta.subject_id = p_worker_id
  );
$$;

revoke all on function private.worker_has_current_terms_acceptance(uuid,timestamptz) from public, anon, authenticated;

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
  join public.worker_venue_associations a
    on a.id = e.worker_venue_association_id
   and a.worker_id = w.id
  join public.venues v on v.id = a.venue_id
  where upper(e.short_code) = upper(trim(p_short_code))
    and e.endpoint_status = 'active'
    and w.worker_status = 'active'
    and a.association_status = 'verified'
    and a.ended_at is null
    and v.venue_status = 'active'
    and exists (
      select 1
      from public.provider_settlement_profiles s
      where s.worker_id = w.id
        and s.settlement_readiness = 'ready'
        and s.disabled_at is null
    )
    and private.worker_has_current_terms_acceptance(w.id, now())
  limit 1;
$$;

revoke all on function public.resolve_short_code(text) from public;
grant execute on function public.resolve_short_code(text) to anon, authenticated;

create or replace function public.get_public_tipping_profile(p_public_token text)
returns table (
  display_name text,
  worker_role text,
  venue_name text,
  venue_location text,
  public_photo_path text,
  verified boolean
)
language sql
stable
security definer
set search_path = public, private
as $$
  select
    w.display_first_name,
    a.worker_role,
    coalesce(v.branch_name, v.trading_name),
    coalesce(v.public_location_label, v.city),
    w.public_photo_path,
    true
  from public.worker_tipping_endpoints e
  join public.workers w on w.id = e.worker_id
  join public.worker_venue_associations a
    on a.id = e.worker_venue_association_id
   and a.worker_id = w.id
  join public.venues v on v.id = a.venue_id
  where e.public_token = p_public_token
    and e.endpoint_status = 'active'
    and w.worker_status = 'active'
    and a.association_status = 'verified'
    and a.ended_at is null
    and v.venue_status = 'active'
    and exists (
      select 1
      from public.provider_settlement_profiles s
      where s.worker_id = w.id
        and s.settlement_readiness = 'ready'
        and s.disabled_at is null
    )
    and private.worker_has_current_terms_acceptance(w.id, now());
$$;

revoke all on function public.get_public_tipping_profile(text) from public;
grant execute on function public.get_public_tipping_profile(text) to anon, authenticated;

create or replace function public.quote_tip(p_public_token text, p_gross_gratuity_cents bigint)
returns table (
  worker_display_name text,
  worker_role text,
  venue_name text,
  gross_gratuity_cents bigint,
  customer_fee_cents bigint,
  customer_total_cents bigint,
  worker_fee_cents bigint,
  worker_net_cents bigint,
  swifttip_gross_revenue_cents bigint,
  currency char(3),
  pricing_version_id uuid
)
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_endpoint public.worker_tipping_endpoints;
  v_worker public.workers;
  v_assoc public.worker_venue_associations;
  v_venue public.venues;
  v_settlement public.provider_settlement_profiles;
  v_pricing public.pricing_versions;
  v_worker_fee bigint;
  v_customer_fee bigint;
begin
  select * into strict v_endpoint
  from public.worker_tipping_endpoints e
  where e.public_token = p_public_token
    and e.endpoint_status = 'active';

  select * into strict v_worker
  from public.workers
  where id = v_endpoint.worker_id
    and worker_status = 'active';

  select * into strict v_assoc
  from public.worker_venue_associations
  where id = v_endpoint.worker_venue_association_id
    and worker_id = v_worker.id
    and association_status = 'verified'
    and ended_at is null;

  select * into strict v_venue
  from public.venues
  where id = v_assoc.venue_id
    and venue_status = 'active';

  select * into strict v_settlement
  from public.provider_settlement_profiles s
  where s.worker_id = v_worker.id
    and s.settlement_readiness = 'ready'
    and s.disabled_at is null
  limit 1;

  if not private.worker_has_current_terms_acceptance(v_worker.id, now()) then
    raise exception 'Current Worker terms not accepted';
  end if;

  v_pricing := private.get_active_pricing(now());
  if p_gross_gratuity_cents < v_pricing.minimum_gratuity_cents
     or p_gross_gratuity_cents > v_pricing.maximum_gratuity_cents then
    raise exception 'Gratuity outside configured range';
  end if;

  v_worker_fee := private.percent_cents(p_gross_gratuity_cents, v_pricing.worker_fee_bps);
  v_customer_fee := v_pricing.customer_fixed_fee_cents
    + private.percent_cents(p_gross_gratuity_cents, v_pricing.customer_fee_bps);
  if v_pricing.customer_fee_cap_cents is not null then
    v_customer_fee := least(v_customer_fee, v_pricing.customer_fee_cap_cents);
  end if;

  return query select
    v_worker.display_first_name,
    v_assoc.worker_role,
    coalesce(v_venue.branch_name, v_venue.trading_name),
    p_gross_gratuity_cents,
    v_customer_fee,
    p_gross_gratuity_cents + v_customer_fee,
    v_worker_fee,
    p_gross_gratuity_cents - v_worker_fee,
    v_customer_fee + v_worker_fee,
    v_pricing.currency,
    v_pricing.id;
end;
$$;

revoke all on function public.quote_tip(text,bigint) from public;
grant execute on function public.quote_tip(text,bigint) to anon, authenticated;

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
  if p_public_token is null or length(trim(p_public_token)) <> 48 then
    raise exception 'Invalid tipping endpoint';
  end if;

  if p_idempotency_key is null or length(trim(p_idempotency_key)) < 8 then
    raise exception 'Idempotency key is required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('create_tip:' || p_idempotency_key, 0));

  v_request_hash := encode(
    digest(p_public_token || ':' || p_gross_gratuity_cents::text, 'sha256'),
    'hex'
  );

  select resource_id into v_existing_resource
  from private.idempotency_keys
  where operation = 'create_tip'
    and idempotency_key = p_idempotency_key;

  if v_existing_resource is not null then
    if exists (
      select 1
      from private.idempotency_keys
      where operation = 'create_tip'
        and idempotency_key = p_idempotency_key
        and request_hash <> v_request_hash
    ) then
      raise exception 'Idempotency key reused with different request';
    end if;

    select * into strict v_tip
    from public.tips
    where id = v_existing_resource;

    return query select
      v_tip.id,
      v_tip.swifttip_reference,
      v_tip.expires_at,
      v_tip.gross_gratuity_cents,
      v_tip.customer_fee_cents,
      v_tip.customer_total_cents,
      v_tip.worker_fee_cents,
      v_tip.worker_net_cents,
      v_tip.currency;
    return;
  end if;

  select * into strict v_endpoint
  from public.worker_tipping_endpoints e
  where e.public_token = p_public_token
    and e.endpoint_status = 'active';

  select * into strict v_worker
  from public.workers
  where id = v_endpoint.worker_id
    and worker_status = 'active';

  select * into strict v_assoc
  from public.worker_venue_associations
  where id = v_endpoint.worker_venue_association_id
    and worker_id = v_worker.id
    and association_status = 'verified'
    and ended_at is null;

  select * into strict v_venue
  from public.venues
  where id = v_assoc.venue_id
    and venue_status = 'active';

  select * into strict v_settlement
  from public.provider_settlement_profiles s
  where s.worker_id = v_worker.id
    and s.settlement_readiness = 'ready'
    and s.disabled_at is null
  limit 1;

  if not private.worker_has_current_terms_acceptance(v_worker.id, now()) then
    raise exception 'Current Worker terms not accepted';
  end if;

  v_pricing := private.get_active_pricing(now());
  if p_gross_gratuity_cents < v_pricing.minimum_gratuity_cents
     or p_gross_gratuity_cents > v_pricing.maximum_gratuity_cents then
    raise exception 'Gratuity outside configured range';
  end if;

  select * into strict v_terms
  from public.terms_versions tv
  where tv.terms_type = 'customer_transaction_terms'
    and tv.published_at is not null
    and tv.published_at <= now()
    and tv.effective_from <= now()
    and (tv.retired_at is null or tv.retired_at > now())
  order by tv.effective_from desc, tv.published_at desc
  limit 1;

  v_worker_fee := private.percent_cents(p_gross_gratuity_cents, v_pricing.worker_fee_bps);
  v_customer_fee := v_pricing.customer_fixed_fee_cents
    + private.percent_cents(p_gross_gratuity_cents, v_pricing.customer_fee_bps);
  if v_pricing.customer_fee_cap_cents is not null then
    v_customer_fee := least(v_customer_fee, v_pricing.customer_fee_cap_cents);
  end if;

  loop
    v_reference := 'ST-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
    exit when not exists (
      select 1 from public.tips where swifttip_reference = v_reference
    );
  end loop;

  insert into public.tips (
    swifttip_reference,
    worker_id,
    venue_id,
    worker_venue_association_id,
    tipping_endpoint_id,
    pricing_version_id,
    tip_status,
    currency,
    gross_gratuity_cents,
    customer_fee_cents,
    customer_total_cents,
    worker_fee_cents,
    worker_net_cents,
    swifttip_gross_revenue_cents,
    worker_display_name_snapshot,
    worker_role_snapshot,
    venue_name_snapshot,
    customer_terms_version_id,
    client_idempotency_key,
    expires_at
  ) values (
    v_reference,
    v_worker.id,
    v_venue.id,
    v_assoc.id,
    v_endpoint.id,
    v_pricing.id,
    'created',
    v_pricing.currency,
    p_gross_gratuity_cents,
    v_customer_fee,
    p_gross_gratuity_cents + v_customer_fee,
    v_worker_fee,
    p_gross_gratuity_cents - v_worker_fee,
    v_customer_fee + v_worker_fee,
    v_worker.display_first_name,
    v_assoc.worker_role,
    coalesce(v_venue.branch_name, v_venue.trading_name),
    v_terms.id,
    p_idempotency_key,
    now() + interval '15 minutes'
  )
  returning * into v_tip;

  insert into private.idempotency_keys(
    operation,
    idempotency_key,
    request_hash,
    resource_type,
    resource_id,
    response_code
  ) values (
    'create_tip',
    p_idempotency_key,
    v_request_hash,
    'tip',
    v_tip.id,
    201
  );

  insert into public.terms_acceptances(
    terms_version_id,
    subject_type,
    subject_id,
    tip_id,
    acceptance_method,
    evidence_metadata
  ) values (
    v_terms.id,
    'customer_transaction',
    null,
    v_tip.id,
    'transaction_creation',
    jsonb_build_object('pricing_version_id', v_pricing.id)
  );

  return query select
    v_tip.id,
    v_tip.swifttip_reference,
    v_tip.expires_at,
    v_tip.gross_gratuity_cents,
    v_tip.customer_fee_cents,
    v_tip.customer_total_cents,
    v_tip.worker_fee_cents,
    v_tip.worker_net_cents,
    v_tip.currency;
end;
$$;

revoke all on function public.create_tip(text,bigint,text) from public;
grant execute on function public.create_tip(text,bigint,text) to anon, authenticated;

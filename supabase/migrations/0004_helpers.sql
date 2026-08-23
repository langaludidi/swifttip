-- SwiftTip MVP v3 — canonical helper functions and immutability guards

create or replace function private.current_worker_id()
returns uuid
language sql
stable
security definer
set search_path = public, private
as $$
  select w.id
  from public.workers w
  where w.user_id = auth.uid()
  limit 1;
$$;

create or replace function private.current_admin_role()
returns text
language sql
stable
security definer
set search_path = public, private
as $$
  select a.admin_role
  from public.admin_memberships a
  where a.user_id = auth.uid() and a.admin_status = 'active'
  limit 1;
$$;

create or replace function private.user_has_venue_access(p_venue_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select exists (
    select 1
    from public.venue_memberships vm
    where vm.user_id = auth.uid()
      and vm.venue_id = p_venue_id
      and vm.membership_status = 'active'
  );
$$;

revoke all on function private.current_worker_id() from public;
revoke all on function private.current_admin_role() from public;
revoke all on function private.user_has_venue_access(uuid) from public;
grant execute on function private.current_worker_id() to authenticated;
grant execute on function private.current_admin_role() to authenticated;
grant execute on function private.user_has_venue_access(uuid) to authenticated;
grant usage on schema private to authenticated;

create or replace function private.percent_cents(p_amount_cents bigint, p_bps integer)
returns bigint
language plpgsql
immutable
strict
set search_path = public, private
as $$
begin
  if p_amount_cents < 0 or p_bps < 0 then
    raise exception 'amount and basis points must be non-negative';
  end if;
  return ((p_amount_cents * p_bps) + 5000) / 10000;
end;
$$;
revoke all on function private.percent_cents(bigint,integer) from public;

create or replace function private.get_active_pricing(p_at timestamptz default now())
returns public.pricing_versions
language plpgsql
stable
security definer
set search_path = public, private
as $$
declare
  v_pricing public.pricing_versions;
begin
  select * into strict v_pricing
  from public.pricing_versions p
  where p.pricing_status = 'active'
    and (p.effective_from is null or p.effective_from <= p_at)
    and (p.effective_until is null or p.effective_until > p_at)
  limit 1;
  return v_pricing;
exception
  when no_data_found then raise exception 'No active pricing version';
  when too_many_rows then raise exception 'Overlapping active pricing versions';
end;
$$;
revoke all on function private.get_active_pricing(timestamptz) from public;

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
  where e.public_token = p_public_token and e.endpoint_status = 'active';

  select * into strict v_worker from public.workers where id = v_endpoint.worker_id;
  select * into strict v_assoc from public.worker_venue_associations where id = v_endpoint.worker_venue_association_id;
  select * into strict v_venue from public.venues where id = v_assoc.venue_id;
  select * into strict v_settlement
  from public.provider_settlement_profiles s
  where s.worker_id = v_worker.id and s.settlement_readiness = 'ready' and s.disabled_at is null
  limit 1;

  if v_worker.worker_status <> 'active' or v_assoc.association_status <> 'verified' or v_venue.venue_status <> 'active' then
    raise exception 'Worker unavailable';
  end if;
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

  v_worker_fee := private.percent_cents(p_gross_gratuity_cents, v_pricing.worker_fee_bps);
  v_customer_fee := v_pricing.customer_fixed_fee_cents + private.percent_cents(p_gross_gratuity_cents, v_pricing.customer_fee_bps);
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
  join public.worker_venue_associations a on a.id = e.worker_venue_association_id
  join public.venues v on v.id = a.venue_id
  where e.public_token = p_public_token
    and e.endpoint_status = 'active'
    and w.worker_status = 'active'
    and a.association_status = 'verified'
    and v.venue_status = 'active'
    and exists (
      select 1 from public.provider_settlement_profiles s
      where s.worker_id = w.id and s.settlement_readiness = 'ready' and s.disabled_at is null
    )
    and exists (
      select 1
      from public.terms_acceptances ta
      join public.terms_versions tv on tv.id = ta.terms_version_id
      where ta.subject_type = 'worker' and ta.subject_id = w.id
        and tv.terms_type = 'worker_terms' and tv.effective_from <= now()
        and (tv.retired_at is null or tv.retired_at > now())
    );
$$;
revoke all on function public.get_public_tipping_profile(text) from public;
grant execute on function public.get_public_tipping_profile(text) to anon, authenticated;

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

revoke all on function private.protect_tip_financial_snapshot() from public;

create trigger protect_completed_tip_snapshot
before update on public.tips
for each row execute function private.protect_tip_financial_snapshot();

create or replace function private.prevent_financial_delete()
returns trigger
language plpgsql
set search_path = public, private
as $$
begin
  raise exception 'Financial records cannot be deleted through normal application operations';
end;
$$;

revoke all on function private.prevent_financial_delete() from public;

create trigger no_delete_completed_tips before delete on public.tips for each row when (old.tip_status = 'completed') execute function private.prevent_financial_delete();
create trigger no_delete_payment_attempts before delete on public.payment_attempts for each row execute function private.prevent_financial_delete();
create trigger no_delete_allocations before delete on public.financial_allocations for each row execute function private.prevent_financial_delete();
create trigger no_delete_settlements before delete on public.settlements for each row execute function private.prevent_financial_delete();
create trigger no_delete_refunds before delete on public.refunds for each row execute function private.prevent_financial_delete();
create trigger no_delete_disputes before delete on public.disputes for each row execute function private.prevent_financial_delete();

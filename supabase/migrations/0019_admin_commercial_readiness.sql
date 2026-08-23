-- SwiftTip MVP v3 — read-only commercial configuration and go-live readiness projections.
-- Deliberately contains no pricing activation or terms publication mutation.

create or replace function public.admin_get_pricing_versions()
returns table (
  pricing_id uuid,
  version_code text,
  pricing_status text,
  effective_from timestamptz,
  effective_until timestamptz,
  worker_fee_bps integer,
  customer_fixed_fee_cents bigint,
  customer_fee_bps integer,
  customer_fee_cap_cents bigint,
  minimum_gratuity_cents bigint,
  maximum_gratuity_cents bigint,
  high_value_threshold_cents bigint,
  currency char(3),
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, private
as $$
begin
  perform private.require_admin_role(array['operations_admin','finance_admin','super_admin']);
  return query
  select p.id,p.version_code,p.pricing_status,p.effective_from,p.effective_until,
         p.worker_fee_bps,p.customer_fixed_fee_cents,p.customer_fee_bps,p.customer_fee_cap_cents,
         p.minimum_gratuity_cents,p.maximum_gratuity_cents,p.high_value_threshold_cents,p.currency,p.created_at
  from public.pricing_versions p
  order by p.created_at desc;
end;
$$;

create or replace function public.admin_get_commercial_readiness()
returns table (
  draft_pricing_versions bigint,
  active_pricing_versions bigint,
  worker_terms_published boolean,
  venue_terms_published boolean,
  customer_terms_published boolean,
  privacy_notice_published boolean,
  active_venues bigint,
  active_workers bigint,
  workers_awaiting_activation bigint,
  workers_settlement_ready bigint
)
language plpgsql
stable
security definer
set search_path = public, private
as $$
begin
  perform private.require_admin_role(array['operations_admin','finance_admin','super_admin']);
  return query
  select
    (select count(*) from public.pricing_versions where pricing_status='draft'),
    (select count(*) from public.pricing_versions where pricing_status='active' and effective_from <= now() and (effective_until is null or effective_until > now())),
    exists(select 1 from public.terms_versions where terms_type='worker_terms' and published_at is not null and effective_from <= now() and (retired_at is null or retired_at > now())),
    exists(select 1 from public.terms_versions where terms_type='venue_terms' and published_at is not null and effective_from <= now() and (retired_at is null or retired_at > now())),
    exists(select 1 from public.terms_versions where terms_type='customer_transaction_terms' and published_at is not null and effective_from <= now() and (retired_at is null or retired_at > now())),
    exists(select 1 from public.terms_versions where terms_type='privacy_notice' and published_at is not null and effective_from <= now() and (retired_at is null or retired_at > now())),
    (select count(*) from public.venues where venue_status='active'),
    (select count(*) from public.workers where worker_status='active'),
    (select count(*) from public.workers where worker_status='draft'),
    (select count(distinct worker_id) from public.provider_settlement_profiles where disabled_at is null and settlement_readiness='ready');
end;
$$;

revoke all on function public.admin_get_pricing_versions() from public, anon;
revoke all on function public.admin_get_commercial_readiness() from public, anon;
grant execute on function public.admin_get_pricing_versions() to authenticated;
grant execute on function public.admin_get_commercial_readiness() to authenticated;

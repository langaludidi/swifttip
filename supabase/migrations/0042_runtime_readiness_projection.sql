-- SwiftTip MVP v3 — expose the public Tip intake kill switch and safety ceilings
-- through the existing MFA/RBAC-gated commercial readiness projection.
-- Read-only: this migration adds no way to enable intake.

drop function if exists public.admin_get_commercial_readiness();

create function public.admin_get_commercial_readiness()
returns table (
  draft_pricing_versions bigint,
  active_pricing_versions bigint,
  legal_draft_versions bigint,
  legal_under_review_versions bigint,
  legal_approved_unpublished_versions bigint,
  worker_terms_published boolean,
  venue_terms_published boolean,
  customer_terms_published boolean,
  privacy_notice_published boolean,
  active_venues bigint,
  active_workers bigint,
  workers_awaiting_activation bigint,
  workers_settlement_ready bigint,
  public_tip_intake_enabled boolean,
  public_tip_intake_ready boolean,
  public_tip_intake_control_reason text,
  max_tip_intents_per_endpoint_1m integer,
  max_tip_intents_per_endpoint_15m integer
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
    (select count(*) from public.pricing_versions where pricing_status='active' and (effective_from is null or effective_from <= now()) and (effective_until is null or effective_until > now())),
    (select count(*) from public.terms_versions where review_status='draft' and published_at is null),
    (select count(*) from public.terms_versions where review_status='under_review' and published_at is null),
    (select count(*) from public.terms_versions where review_status='approved' and published_at is null),
    exists(select 1 from public.terms_versions where terms_type='worker_terms' and published_at is not null and published_at <= now() and effective_from <= now() and (retired_at is null or retired_at > now())),
    exists(select 1 from public.terms_versions where terms_type='venue_terms' and published_at is not null and published_at <= now() and effective_from <= now() and (retired_at is null or retired_at > now())),
    exists(select 1 from public.terms_versions where terms_type='customer_transaction_terms' and published_at is not null and published_at <= now() and effective_from <= now() and (retired_at is null or retired_at > now())),
    exists(select 1 from public.terms_versions where terms_type='privacy_notice' and published_at is not null and published_at <= now() and effective_from <= now() and (retired_at is null or retired_at > now())),
    (select count(*) from public.venues where venue_status='active'),
    (select count(*) from public.workers where worker_status='active'),
    (select count(*) from public.workers where worker_status='draft'),
    (select count(distinct worker_id) from public.provider_settlement_profiles where disabled_at is null and settlement_readiness='ready'),
    coalesce((select rc.public_tip_intake_enabled from private.runtime_controls rc where rc.singleton), false),
    private.public_tip_intake_ready(now()),
    (select rc.control_reason from private.runtime_controls rc where rc.singleton),
    (select rc.max_tip_intents_per_endpoint_1m from private.runtime_controls rc where rc.singleton),
    (select rc.max_tip_intents_per_endpoint_15m from private.runtime_controls rc where rc.singleton);
end;
$$;

revoke all on function public.admin_get_commercial_readiness() from public, anon;
grant execute on function public.admin_get_commercial_readiness() to authenticated;

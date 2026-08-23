-- SwiftTip MVP v3 — defence-in-depth hardening of client database privileges.
--
-- Canonical application mutations are performed through explicitly granted
-- SECURITY DEFINER RPCs or server/provider integration paths. No public table
-- below has an authenticated write RLS policy, so direct client DML is neither
-- required nor intended.
--
-- Preserve authenticated read access where it already exists, remove all direct
-- anonymous table access, and prevent future postgres-owned objects in public
-- from automatically inheriting broad anon/authenticated privileges.

-- Future SwiftTip objects created by the migration role must be explicitly granted.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;

alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated;

alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;

-- Current authoritative application tables: anonymous callers use narrow public
-- RPCs only and receive no direct table privileges.
revoke all privileges on table
  public.admin_memberships,
  public.disputes,
  public.financial_allocations,
  public.notifications,
  public.payment_attempts,
  public.pilot_cohort_venues,
  public.pilot_cohorts,
  public.pricing_versions,
  public.provider_settlement_profiles,
  public.refunds,
  public.settlements,
  public.support_cases,
  public.terms_acceptances,
  public.tips,
  public.user_profiles,
  public.venue_memberships,
  public.venues,
  public.worker_tipping_endpoints,
  public.worker_venue_associations,
  public.worker_verifications,
  public.workers
from anon;

-- Signed-in actors retain only direct reads. All writes remain behind controlled
-- RPCs/provider-server code, giving table ACLs and RLS independent enforcement.
revoke all privileges on table
  public.admin_memberships,
  public.disputes,
  public.financial_allocations,
  public.notifications,
  public.payment_attempts,
  public.pilot_cohort_venues,
  public.pilot_cohorts,
  public.pricing_versions,
  public.provider_settlement_profiles,
  public.refunds,
  public.settlements,
  public.support_cases,
  public.terms_acceptances,
  public.tips,
  public.user_profiles,
  public.venue_memberships,
  public.venues,
  public.worker_tipping_endpoints,
  public.worker_venue_associations,
  public.worker_verifications,
  public.workers
from authenticated;

grant select on table
  public.admin_memberships,
  public.disputes,
  public.financial_allocations,
  public.notifications,
  public.payment_attempts,
  public.pilot_cohort_venues,
  public.pilot_cohorts,
  public.pricing_versions,
  public.provider_settlement_profiles,
  public.refunds,
  public.settlements,
  public.support_cases,
  public.terms_acceptances,
  public.tips,
  public.user_profiles,
  public.venue_memberships,
  public.venues,
  public.worker_tipping_endpoints,
  public.worker_venue_associations,
  public.worker_verifications,
  public.workers
to authenticated;

-- terms_versions intentionally remains RPC-only and receives no direct grant.

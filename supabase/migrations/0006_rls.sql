-- SwiftTip MVP v3 — row level security baseline

alter table public.user_profiles enable row level security;
alter table public.workers enable row level security;
alter table public.venues enable row level security;
alter table public.venue_memberships enable row level security;
alter table public.worker_venue_associations enable row level security;
alter table public.worker_verifications enable row level security;
alter table public.provider_settlement_profiles enable row level security;
alter table public.worker_tipping_endpoints enable row level security;
alter table public.pricing_versions enable row level security;
alter table public.terms_versions enable row level security;
alter table public.terms_acceptances enable row level security;
alter table public.pilot_cohorts enable row level security;
alter table public.pilot_cohort_venues enable row level security;
alter table public.tips enable row level security;
alter table public.payment_attempts enable row level security;
alter table public.financial_allocations enable row level security;
alter table public.settlements enable row level security;
alter table public.refunds enable row level security;
alter table public.disputes enable row level security;
alter table public.notifications enable row level security;
alter table public.support_cases enable row level security;
alter table public.admin_memberships enable row level security;

create policy user_profile_self_read on public.user_profiles for select to authenticated using (id = auth.uid());
create policy worker_self_read on public.workers for select to authenticated using (user_id = auth.uid());

create policy venue_member_venue_read on public.venues for select to authenticated
using (private.user_has_venue_access(id));
create policy venue_membership_self_read on public.venue_memberships for select to authenticated
using (user_id = auth.uid());

create policy worker_association_self_or_venue_read on public.worker_venue_associations for select to authenticated
using (worker_id = private.current_worker_id() or private.user_has_venue_access(venue_id));

create policy worker_verification_self_read on public.worker_verifications for select to authenticated
using (worker_id = private.current_worker_id());
create policy settlement_profile_self_read on public.provider_settlement_profiles for select to authenticated
using (worker_id = private.current_worker_id());
create policy tipping_endpoint_self_read on public.worker_tipping_endpoints for select to authenticated
using (worker_id = private.current_worker_id());

create policy pricing_authenticated_read on public.pricing_versions for select to authenticated using (true);
create policy terms_authenticated_read on public.terms_versions for select to authenticated using (true);
create policy terms_acceptance_self_read on public.terms_acceptances for select to authenticated
using ((subject_type = 'worker' and subject_id = private.current_worker_id()) or (subject_type = 'venue_user' and subject_id = auth.uid()));

create policy pilot_venue_member_read on public.pilot_cohorts for select to authenticated
using (exists (select 1 from public.pilot_cohort_venues pcv where pcv.pilot_cohort_id = id and private.user_has_venue_access(pcv.venue_id)));
create policy pilot_cohort_venue_member_read on public.pilot_cohort_venues for select to authenticated
using (private.user_has_venue_access(venue_id));

create policy worker_tip_read on public.tips for select to authenticated
using (worker_id = private.current_worker_id());
create policy worker_payment_attempt_read on public.payment_attempts for select to authenticated
using (exists (select 1 from public.tips t where t.id = tip_id and t.worker_id = private.current_worker_id()));
create policy worker_allocation_read on public.financial_allocations for select to authenticated
using (exists (select 1 from public.tips t where t.id = tip_id and t.worker_id = private.current_worker_id()) and allocation_type in ('worker_net','swifttip_worker_fee'));
create policy worker_settlement_read on public.settlements for select to authenticated
using (exists (select 1 from public.financial_allocations a join public.tips t on t.id = a.tip_id where a.id = allocation_id and t.worker_id = private.current_worker_id()));
create policy worker_refund_read on public.refunds for select to authenticated
using (exists (select 1 from public.tips t where t.id = tip_id and t.worker_id = private.current_worker_id()));
create policy worker_dispute_read on public.disputes for select to authenticated
using (exists (select 1 from public.tips t where t.id = tip_id and t.worker_id = private.current_worker_id()));

create policy notification_self_read on public.notifications for select to authenticated using (recipient_user_id = auth.uid());
create policy support_requester_read on public.support_cases for select to authenticated using (requester_user_id = auth.uid());
create policy admin_membership_self_read on public.admin_memberships for select to authenticated using (user_id = auth.uid());

-- No anonymous SELECT policies exist on master, KYC or financial tables.
-- Anonymous access is through narrowly-scoped security-definer RPCs only.
-- No direct client INSERT/UPDATE/DELETE policies exist for authoritative financial records.

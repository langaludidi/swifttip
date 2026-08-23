-- SwiftTip MVP v3 — RLS evaluation and operational index optimisation

-- Consolidate Venue SELECT policy so PostgreSQL evaluates one permissive policy.
drop policy if exists venue_member_venue_read on public.venues;
drop policy if exists worker_associated_venue_read on public.venues;
create policy venue_authorized_read on public.venues
for select to authenticated
using (
  private.user_has_venue_access(id)
  or exists (
    select 1
    from public.worker_venue_associations a
    where a.venue_id = venues.id
      and a.worker_id = private.current_worker_id()
      and a.association_status in ('pending','verified','suspended')
      and a.ended_at is null
  )
);

-- Evaluate auth.uid() once per statement rather than once per row.
drop policy if exists user_profile_self_read on public.user_profiles;
create policy user_profile_self_read on public.user_profiles
for select to authenticated using (id = (select auth.uid()));

drop policy if exists worker_self_read on public.workers;
create policy worker_self_read on public.workers
for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists venue_membership_self_read on public.venue_memberships;
create policy venue_membership_self_read on public.venue_memberships
for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists terms_acceptance_self_read on public.terms_acceptances;
create policy terms_acceptance_self_read on public.terms_acceptances
for select to authenticated
using (
  (subject_type = 'worker' and subject_id = private.current_worker_id())
  or (subject_type = 'venue_user' and subject_id = (select auth.uid()))
);

drop policy if exists notification_self_read on public.notifications;
create policy notification_self_read on public.notifications
for select to authenticated using (recipient_user_id = (select auth.uid()));

drop policy if exists support_requester_read on public.support_cases;
create policy support_requester_read on public.support_cases
for select to authenticated using (requester_user_id = (select auth.uid()));

drop policy if exists admin_membership_self_read on public.admin_memberships;
create policy admin_membership_self_read on public.admin_memberships
for select to authenticated using (user_id = (select auth.uid()));

-- Foreign-key and high-frequency operational indexes.
create index if not exists verification_documents_verification_idx on private.verification_documents(verification_id);
create index if not exists payment_events_webhook_idx on private.payment_events(webhook_receipt_id) where webhook_receipt_id is not null;
create index if not exists settlement_events_webhook_idx on private.settlement_events(webhook_receipt_id) where webhook_receipt_id is not null;
create index if not exists provider_fees_tip_idx on private.provider_fees(tip_id) where tip_id is not null;
create index if not exists provider_fees_payment_attempt_idx on private.provider_fees(payment_attempt_id) where payment_attempt_id is not null;
create index if not exists provider_fees_settlement_idx on private.provider_fees(settlement_id) where settlement_id is not null;
create index if not exists financial_adjustments_tip_idx on private.financial_adjustments(tip_id);
create index if not exists financial_adjustments_allocation_idx on private.financial_adjustments(allocation_id) where allocation_id is not null;
create index if not exists financial_adjustments_settlement_idx on private.financial_adjustments(settlement_id) where settlement_id is not null;
create index if not exists financial_adjustments_requested_by_idx on private.financial_adjustments(requested_by);
create index if not exists financial_adjustments_approved_by_idx on private.financial_adjustments(approved_by) where approved_by is not null;
create index if not exists idempotency_keys_actor_idx on private.idempotency_keys(actor_id) where actor_id is not null;

create index if not exists admin_memberships_granted_by_idx on public.admin_memberships(granted_by) where granted_by is not null;
create index if not exists disputes_tip_idx on public.disputes(tip_id);
create index if not exists disputes_payment_attempt_idx on public.disputes(payment_attempt_id);
create index if not exists notifications_recipient_idx on public.notifications(recipient_user_id) where recipient_user_id is not null;
create index if not exists pilot_cohort_venues_venue_idx on public.pilot_cohort_venues(venue_id);
create index if not exists pilot_cohorts_pricing_idx on public.pilot_cohorts(pricing_version_id);
create index if not exists pricing_created_by_idx on public.pricing_versions(created_by) where created_by is not null;
create index if not exists pricing_approved_by_idx on public.pricing_versions(approved_by) where approved_by is not null;
create index if not exists refunds_tip_idx on public.refunds(tip_id);
create index if not exists refunds_payment_attempt_idx on public.refunds(payment_attempt_id);
create index if not exists refunds_requested_by_idx on public.refunds(requested_by_user_id) where requested_by_user_id is not null;
create index if not exists refunds_reviewed_by_idx on public.refunds(reviewed_by_user_id) where reviewed_by_user_id is not null;
create index if not exists settlements_profile_idx on public.settlements(settlement_profile_id) where settlement_profile_id is not null;
create index if not exists support_requester_idx on public.support_cases(requester_user_id) where requester_user_id is not null;
create index if not exists support_worker_idx on public.support_cases(worker_id) where worker_id is not null;
create index if not exists support_venue_idx on public.support_cases(venue_id) where venue_id is not null;
create index if not exists terms_acceptances_version_idx on public.terms_acceptances(terms_version_id);
create index if not exists terms_acceptances_tip_idx on public.terms_acceptances(tip_id) where tip_id is not null;
create index if not exists terms_acceptances_subject_idx on public.terms_acceptances(subject_type, subject_id, terms_version_id);
create index if not exists tips_customer_terms_idx on public.tips(customer_terms_version_id) where customer_terms_version_id is not null;
create index if not exists tips_operative_payment_idx on public.tips(operative_payment_attempt_id, id) where operative_payment_attempt_id is not null;
create index if not exists tips_pilot_cohort_idx on public.tips(pilot_cohort_id) where pilot_cohort_id is not null;
create index if not exists tips_endpoint_idx on public.tips(tipping_endpoint_id);
create index if not exists tips_association_idx on public.tips(worker_venue_association_id);
create index if not exists tipping_endpoint_association_idx on public.worker_tipping_endpoints(worker_venue_association_id);
create index if not exists tipping_endpoint_rotated_from_idx on public.worker_tipping_endpoints(rotated_from_endpoint_id) where rotated_from_endpoint_id is not null;
create index if not exists tipping_endpoint_short_code_upper_idx on public.worker_tipping_endpoints(upper(short_code));
create index if not exists provider_settlement_worker_ready_idx on public.provider_settlement_profiles(worker_id, settlement_readiness) where disabled_at is null;
create index if not exists worker_assoc_confirmed_by_idx on public.worker_venue_associations(confirmed_by_user_id) where confirmed_by_user_id is not null;
create index if not exists worker_verifications_reviewed_by_idx on public.worker_verifications(reviewed_by) where reviewed_by is not null;

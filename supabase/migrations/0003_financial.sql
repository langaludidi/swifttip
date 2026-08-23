-- SwiftTip MVP v3 — canonical financial and operations records

create table public.tips (
  id uuid primary key default gen_random_uuid(),
  swifttip_reference text not null unique,
  worker_id uuid not null references public.workers(id) on delete restrict,
  venue_id uuid not null references public.venues(id) on delete restrict,
  worker_venue_association_id uuid not null references public.worker_venue_associations(id) on delete restrict,
  tipping_endpoint_id uuid not null references public.worker_tipping_endpoints(id) on delete restrict,
  pricing_version_id uuid not null references public.pricing_versions(id) on delete restrict,
  pilot_cohort_id uuid references public.pilot_cohorts(id) on delete restrict,
  tip_status text not null default 'created' check (tip_status in ('created','payment_in_progress','completed','cancelled','expired')),
  currency char(3) not null default 'ZAR' check (currency = 'ZAR'),
  gross_gratuity_cents bigint not null check (gross_gratuity_cents > 0),
  customer_fee_cents bigint not null check (customer_fee_cents >= 0),
  customer_total_cents bigint not null check (customer_total_cents > 0),
  worker_fee_cents bigint not null check (worker_fee_cents >= 0),
  worker_net_cents bigint not null check (worker_net_cents >= 0),
  swifttip_gross_revenue_cents bigint not null check (swifttip_gross_revenue_cents >= 0),
  worker_display_name_snapshot text not null,
  worker_role_snapshot text,
  venue_name_snapshot text not null,
  customer_terms_version_id uuid references public.terms_versions(id) on delete restrict,
  client_idempotency_key text,
  expires_at timestamptz not null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  check (customer_total_cents = gross_gratuity_cents + customer_fee_cents),
  check (worker_net_cents = gross_gratuity_cents - worker_fee_cents),
  check (swifttip_gross_revenue_cents = customer_fee_cents + worker_fee_cents)
);
create index tips_worker_created_idx on public.tips(worker_id, created_at desc);
create index tips_venue_created_idx on public.tips(venue_id, created_at desc);
create index tips_status_idx on public.tips(tip_status);
create index tips_pricing_idx on public.tips(pricing_version_id);

alter table public.terms_acceptances
  add constraint terms_acceptances_tip_fk foreign key (tip_id) references public.tips(id) on delete restrict;

create table public.payment_attempts (
  id uuid primary key default gen_random_uuid(),
  tip_id uuid not null references public.tips(id) on delete restrict,
  provider_code text not null,
  provider_payment_ref text,
  payment_state text not null default 'created' check (payment_state in ('created','pending','succeeded','failed','expired','cancelled','reversed')),
  requested_amount_cents bigint not null check (requested_amount_cents > 0),
  currency char(3) not null default 'ZAR' check (currency = 'ZAR'),
  payment_method_type text,
  failure_code text,
  failure_message_safe text,
  initiated_at timestamptz not null default now(),
  provider_completed_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index payment_provider_ref_unique_idx on public.payment_attempts(provider_code, provider_payment_ref) where provider_payment_ref is not null;
create unique index one_successful_payment_per_tip_idx on public.payment_attempts(tip_id) where payment_state = 'succeeded';
create index payment_attempts_tip_idx on public.payment_attempts(tip_id);
create index payment_attempts_state_idx on public.payment_attempts(payment_state);

create table private.provider_webhook_receipts (
  id uuid primary key default gen_random_uuid(),
  provider_code text not null,
  provider_event_id text not null,
  event_type text not null,
  signature_valid boolean not null,
  provider_event_at timestamptz,
  received_at timestamptz not null default now(),
  payload_json jsonb,
  payload_hash text not null,
  processing_status text not null default 'received' check (processing_status in ('received','processed','ignored','failed')),
  processed_at timestamptz,
  processing_error text,
  unique(provider_code, provider_event_id)
);

create table private.payment_events (
  id uuid primary key default gen_random_uuid(),
  payment_attempt_id uuid not null references public.payment_attempts(id) on delete restrict,
  webhook_receipt_id uuid references private.provider_webhook_receipts(id) on delete restrict,
  provider_event_id text,
  event_type text not null,
  event_amount_cents bigint,
  provider_event_at timestamptz,
  recorded_at timestamptz not null default now(),
  evidence_source text not null check (evidence_source in ('webhook','provider_api','reconciliation_file','approved_manual_reconciliation')),
  event_metadata jsonb
);
create index payment_events_attempt_idx on private.payment_events(payment_attempt_id, recorded_at);

create table public.financial_allocations (
  id uuid primary key default gen_random_uuid(),
  tip_id uuid not null references public.tips(id) on delete restrict,
  allocation_type text not null check (allocation_type in ('worker_net','swifttip_worker_fee','swifttip_customer_fee')),
  beneficiary_type text not null check (beneficiary_type in ('worker','swifttip')),
  worker_id uuid references public.workers(id) on delete restrict,
  amount_cents bigint not null check (amount_cents >= 0),
  currency char(3) not null default 'ZAR' check (currency = 'ZAR'),
  allocation_status text not null default 'expected' check (allocation_status in ('expected','confirmed','adjusted','reversed')),
  created_at timestamptz not null default now(),
  unique(tip_id, allocation_type),
  check ((beneficiary_type = 'worker' and worker_id is not null) or beneficiary_type = 'swifttip')
);
create index allocations_worker_idx on public.financial_allocations(worker_id) where worker_id is not null;

create table public.settlements (
  id uuid primary key default gen_random_uuid(),
  allocation_id uuid not null references public.financial_allocations(id) on delete restrict,
  provider_code text not null,
  provider_settlement_ref text,
  settlement_profile_id uuid references public.provider_settlement_profiles(id) on delete restrict,
  settlement_state text not null default 'pending' check (settlement_state in ('pending','processing','succeeded','failed','held','reversed','exception')),
  expected_amount_cents bigint not null check (expected_amount_cents >= 0),
  actual_amount_cents bigint check (actual_amount_cents is null or actual_amount_cents >= 0),
  currency char(3) not null default 'ZAR' check (currency = 'ZAR'),
  expected_settlement_at timestamptz,
  processing_at timestamptz,
  completed_at timestamptz,
  failure_code text,
  created_at timestamptz not null default now()
);
create unique index settlement_provider_ref_unique_idx on public.settlements(provider_code, provider_settlement_ref) where provider_settlement_ref is not null;
create index settlements_allocation_idx on public.settlements(allocation_id);
create index settlements_state_idx on public.settlements(settlement_state);
create index settlements_expected_date_idx on public.settlements(expected_settlement_at);

create table private.settlement_events (
  id uuid primary key default gen_random_uuid(),
  settlement_id uuid not null references public.settlements(id) on delete restrict,
  webhook_receipt_id uuid references private.provider_webhook_receipts(id) on delete restrict,
  provider_event_id text,
  event_type text not null,
  amount_cents bigint,
  provider_event_at timestamptz,
  evidence_source text not null check (evidence_source in ('webhook','provider_api','reconciliation_file','approved_manual_reconciliation')),
  recorded_at timestamptz not null default now(),
  metadata jsonb
);

create table private.provider_fees (
  id uuid primary key default gen_random_uuid(),
  tip_id uuid references public.tips(id) on delete restrict,
  payment_attempt_id uuid references public.payment_attempts(id) on delete restrict,
  settlement_id uuid references public.settlements(id) on delete restrict,
  provider_code text not null,
  provider_fee_ref text,
  fee_type text not null check (fee_type in ('processing','fixed_processing','split','settlement','refund','dispute','other')),
  amount_cents bigint not null check (amount_cents >= 0),
  currency char(3) not null default 'ZAR' check (currency = 'ZAR'),
  provider_event_at timestamptz,
  recorded_at timestamptz not null default now()
);

create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  tip_id uuid not null references public.tips(id) on delete restrict,
  payment_attempt_id uuid not null references public.payment_attempts(id) on delete restrict,
  provider_refund_ref text,
  requested_amount_cents bigint not null check (requested_amount_cents > 0),
  approved_amount_cents bigint check (approved_amount_cents is null or approved_amount_cents > 0),
  refund_status text not null default 'requested' check (refund_status in ('requested','under_review','approved','rejected','submitted','succeeded','failed')),
  refund_reason text not null,
  requested_by_user_id uuid references auth.users(id) on delete restrict,
  reviewed_by_user_id uuid references auth.users(id) on delete restrict,
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  submitted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index refund_provider_ref_unique_idx on public.refunds(provider_refund_ref) where provider_refund_ref is not null;

create table public.disputes (
  id uuid primary key default gen_random_uuid(),
  tip_id uuid not null references public.tips(id) on delete restrict,
  payment_attempt_id uuid not null references public.payment_attempts(id) on delete restrict,
  provider_code text not null,
  provider_dispute_ref text not null,
  disputed_amount_cents bigint not null check (disputed_amount_cents > 0),
  dispute_status text not null check (dispute_status in ('open','evidence_required','evidence_submitted','won','lost','closed')),
  dispute_reason text,
  opened_at timestamptz not null,
  evidence_due_at timestamptz,
  evidence_submitted_at timestamptz,
  resolved_at timestamptz,
  financial_outcome_cents bigint,
  created_at timestamptz not null default now(),
  unique(provider_code, provider_dispute_ref)
);

create table private.financial_adjustments (
  id uuid primary key default gen_random_uuid(),
  tip_id uuid not null references public.tips(id) on delete restrict,
  allocation_id uuid references public.financial_allocations(id) on delete restrict,
  settlement_id uuid references public.settlements(id) on delete restrict,
  adjustment_type text not null,
  direction text not null check (direction in ('credit','debit')),
  amount_cents bigint not null check (amount_cents > 0),
  currency char(3) not null default 'ZAR' check (currency = 'ZAR'),
  reason text not null,
  requested_by uuid not null references auth.users(id) on delete restrict,
  approved_by uuid references auth.users(id) on delete restrict,
  adjustment_status text not null default 'requested' check (adjustment_status in ('requested','approved','rejected','posted')),
  evidence_reference text,
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  check (approved_by is null or requested_by <> approved_by)
);

create table private.reconciliation_records (
  id uuid primary key default gen_random_uuid(),
  tip_id uuid not null references public.tips(id) on delete restrict,
  reconciliation_type text not null check (reconciliation_type in ('customer_collection','worker_allocation','worker_settlement','swifttip_revenue','provider_fee','overall_transaction')),
  expected_amount_cents bigint,
  actual_amount_cents bigint,
  difference_cents bigint,
  reconciliation_status text not null default 'pending' check (reconciliation_status in ('pending','reconciled','exception','resolved')),
  evidence_source text,
  evidence_reference text,
  checked_at timestamptz,
  resolved_at timestamptz,
  resolution_reason text,
  created_at timestamptz not null default now()
);
create index reconciliation_status_idx on private.reconciliation_records(reconciliation_status);
create index reconciliation_tip_idx on private.reconciliation_records(tip_id);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid references auth.users(id) on delete restrict,
  notification_type text not null,
  related_entity_type text,
  related_entity_id uuid,
  channel text not null check (channel in ('in_app','sms','email')),
  notification_status text not null default 'queued' check (notification_status in ('queued','sent','failed','cancelled')),
  sent_at timestamptz,
  failed_at timestamptz,
  failure_reason text,
  created_at timestamptz not null default now()
);

create table public.support_cases (
  id uuid primary key default gen_random_uuid(),
  case_reference text not null unique,
  requester_type text not null check (requester_type in ('customer','worker','venue_user','admin','system')),
  requester_user_id uuid references auth.users(id) on delete restrict,
  requester_contact text,
  category text not null,
  severity text not null default 'normal' check (severity in ('low','normal','high','critical')),
  case_status text not null default 'open' check (case_status in ('open','in_progress','awaiting_customer','awaiting_worker','awaiting_provider','resolved','closed')),
  worker_id uuid references public.workers(id) on delete restrict,
  venue_id uuid references public.venues(id) on delete restrict,
  tip_id uuid references public.tips(id) on delete restrict,
  assigned_admin_user_id uuid references auth.users(id) on delete restrict,
  subject text not null,
  description text not null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  closed_at timestamptz
);
create index support_status_idx on public.support_cases(case_status);
create index support_assignee_idx on public.support_cases(assigned_admin_user_id);
create index support_tip_idx on public.support_cases(tip_id);

create table public.admin_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete restrict,
  admin_role text not null check (admin_role in ('operations_admin','verification_admin','finance_admin','security_admin','super_admin')),
  admin_status text not null default 'active' check (admin_status in ('active','suspended','revoked')),
  mfa_required boolean not null default true,
  granted_by uuid references auth.users(id) on delete restrict,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table private.idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  operation text not null,
  idempotency_key text not null,
  actor_id uuid references auth.users(id) on delete restrict,
  request_hash text not null,
  resource_type text,
  resource_id uuid,
  response_code integer,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  unique(operation, idempotency_key)
);

create table audit.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_type text not null,
  actor_user_id uuid references auth.users(id) on delete restrict,
  actor_role text,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  previous_state jsonb,
  resulting_state jsonb,
  reason text,
  correlation_id uuid,
  source_ip inet,
  user_agent text,
  created_at timestamptz not null default now()
);
create index audit_entity_idx on audit.audit_events(entity_type, entity_id);
create index audit_actor_idx on audit.audit_events(actor_user_id);
create index audit_created_idx on audit.audit_events(created_at desc);

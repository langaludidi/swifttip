-- SwiftTip MVP v3 — identity, worker, venue, pricing and terms

create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  display_name text,
  account_status text not null default 'active' check (account_status in ('active','suspended','disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete restrict,
  legal_first_name text not null,
  legal_last_name text not null,
  display_first_name text not null,
  public_photo_path text,
  worker_status text not null default 'draft' check (worker_status in ('draft','active','suspended','inactive')),
  onboarding_status text not null default 'started' check (onboarding_status in ('started','phone_verified','verification_pending','settlement_pending','ready','blocked')),
  global_suspension_reason text,
  activated_at timestamptz,
  suspended_at timestamptz,
  deactivated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.venues (
  id uuid primary key default gen_random_uuid(),
  legal_name text,
  trading_name text not null,
  branch_name text,
  venue_type text not null check (venue_type in ('fuel_station','car_wash','valet','hotel','restaurant','other')),
  address_line_1 text,
  address_line_2 text,
  city text,
  province text,
  postal_code text,
  country_code char(2) not null default 'ZA' check (country_code = 'ZA'),
  public_location_label text,
  venue_status text not null default 'draft' check (venue_status in ('draft','pending_review','active','suspended','closed')),
  approved_at timestamptz,
  suspended_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index venues_status_idx on public.venues(venue_status);
create index venues_type_idx on public.venues(venue_type);

create table public.venue_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  venue_id uuid not null references public.venues(id) on delete restrict,
  venue_role text not null check (venue_role in ('venue_admin','venue_viewer')),
  membership_status text not null default 'invited' check (membership_status in ('invited','active','revoked')),
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  unique(user_id, venue_id)
);
create index venue_memberships_user_idx on public.venue_memberships(user_id, membership_status);
create index venue_memberships_venue_idx on public.venue_memberships(venue_id, membership_status);

create table public.worker_venue_associations (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.workers(id) on delete restrict,
  venue_id uuid not null references public.venues(id) on delete restrict,
  worker_role text not null,
  association_status text not null default 'pending' check (association_status in ('pending','verified','rejected','suspended','ended')),
  confirmed_by_user_id uuid references auth.users(id) on delete restrict,
  confirmed_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  internal_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index wva_worker_idx on public.worker_venue_associations(worker_id);
create index wva_venue_idx on public.worker_venue_associations(venue_id);
create index wva_status_idx on public.worker_venue_associations(association_status);
create unique index one_verified_live_venue_per_worker_idx
  on public.worker_venue_associations(worker_id)
  where association_status = 'verified' and ended_at is null;

create table public.worker_verifications (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.workers(id) on delete restrict,
  verification_type text not null,
  verification_status text not null default 'not_started' check (verification_status in ('not_started','submitted','under_review','additional_info_required','approved','rejected','expired')),
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete restrict,
  decision_reason text,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
create index worker_verification_worker_idx on public.worker_verifications(worker_id);
create index worker_verification_status_idx on public.worker_verifications(verification_status);

create table private.verification_documents (
  id uuid primary key default gen_random_uuid(),
  verification_id uuid not null references public.worker_verifications(id) on delete restrict,
  storage_path text not null,
  document_type text not null,
  mime_type text not null,
  file_size_bytes bigint not null check (file_size_bytes >= 0),
  sha256_hash text,
  uploaded_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.provider_settlement_profiles (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.workers(id) on delete restrict,
  provider_code text not null,
  provider_account_ref text not null,
  verification_status text not null default 'pending' check (verification_status in ('pending','approved','rejected','blocked','expired')),
  settlement_readiness text not null default 'not_ready' check (settlement_readiness in ('not_ready','pending','ready','blocked')),
  masked_destination text,
  destination_type text,
  verified_at timestamptz,
  disabled_at timestamptz,
  provider_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(worker_id, provider_code)
);

create table public.worker_tipping_endpoints (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.workers(id) on delete restrict,
  worker_venue_association_id uuid not null references public.worker_venue_associations(id) on delete restrict,
  public_token text not null unique,
  short_code text not null unique,
  endpoint_status text not null default 'active' check (endpoint_status in ('active','disabled','rotated','expired')),
  created_at timestamptz not null default now(),
  disabled_at timestamptz,
  rotated_from_endpoint_id uuid references public.worker_tipping_endpoints(id) on delete restrict
);
create index worker_endpoint_worker_idx on public.worker_tipping_endpoints(worker_id, endpoint_status);

create table public.pricing_versions (
  id uuid primary key default gen_random_uuid(),
  version_code text not null unique,
  pricing_status text not null default 'draft' check (pricing_status in ('draft','scheduled','active','retired')),
  effective_from timestamptz,
  effective_until timestamptz,
  worker_fee_bps integer not null check (worker_fee_bps between 0 and 10000),
  customer_fixed_fee_cents bigint not null check (customer_fixed_fee_cents >= 0),
  customer_fee_bps integer not null check (customer_fee_bps between 0 and 10000),
  customer_fee_cap_cents bigint check (customer_fee_cap_cents is null or customer_fee_cap_cents >= 0),
  minimum_gratuity_cents bigint not null check (minimum_gratuity_cents > 0),
  maximum_gratuity_cents bigint not null check (maximum_gratuity_cents >= minimum_gratuity_cents),
  high_value_threshold_cents bigint not null check (high_value_threshold_cents > 0),
  currency char(3) not null default 'ZAR' check (currency = 'ZAR'),
  created_by uuid references auth.users(id) on delete restrict,
  approved_by uuid references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  check (effective_until is null or effective_from is null or effective_until > effective_from)
);
create unique index one_active_pricing_version_idx on public.pricing_versions((pricing_status)) where pricing_status = 'active';

create table public.terms_versions (
  id uuid primary key default gen_random_uuid(),
  terms_type text not null check (terms_type in ('worker_terms','venue_terms','customer_transaction_terms','privacy_notice')),
  version_code text not null,
  content_hash text not null,
  published_at timestamptz,
  effective_from timestamptz not null,
  retired_at timestamptz,
  created_at timestamptz not null default now(),
  unique(terms_type, version_code)
);

create table public.terms_acceptances (
  id uuid primary key default gen_random_uuid(),
  terms_version_id uuid not null references public.terms_versions(id) on delete restrict,
  subject_type text not null check (subject_type in ('worker','venue_user','customer_transaction')),
  subject_id uuid,
  tip_id uuid,
  accepted_at timestamptz not null default now(),
  acceptance_method text not null,
  evidence_metadata jsonb,
  created_at timestamptz not null default now()
);

create table public.pilot_cohorts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  cohort_status text not null default 'draft' check (cohort_status in ('draft','active','closed')),
  cohort_type text,
  pricing_version_id uuid not null references public.pricing_versions(id) on delete restrict,
  start_at timestamptz,
  end_at timestamptz,
  created_at timestamptz not null default now(),
  check (end_at is null or start_at is null or end_at > start_at)
);

create table public.pilot_cohort_venues (
  id uuid primary key default gen_random_uuid(),
  pilot_cohort_id uuid not null references public.pilot_cohorts(id) on delete restrict,
  venue_id uuid not null references public.venues(id) on delete restrict,
  joined_at timestamptz not null default now(),
  unique(pilot_cohort_id, venue_id)
);

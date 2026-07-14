-- ============================================================================
-- Worker verification status, per Sprint 2 scope. No code reads or writes
-- this yet — this migration is schema only.
-- ============================================================================
create type worker_status as enum ('draft', 'submitted', 'under_review', 'approved', 'rejected', 'suspended');

alter table public.workers
  add column status worker_status not null default 'draft',
  add column submitted_at timestamptz,
  add column reviewed_at timestamptz,
  add column rejection_reason text;

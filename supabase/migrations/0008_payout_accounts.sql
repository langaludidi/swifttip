-- ============================================================================
-- Payout (banking) accounts — separate from `workers` so changing banks keeps
-- history instead of overwriting it. Only one row per worker should be
-- `active` at a time; submitting a new account should flip the old one to
-- inactive rather than deleting/updating it.
-- ============================================================================
create table public.payout_accounts (
  id             uuid primary key default gen_random_uuid(),
  worker_id      uuid not null references public.workers(id) on delete cascade,
  bank_name      text not null,
  account_number text not null,
  account_type   text not null check (account_type in ('Savings', 'Cheque', 'Transmission')),
  active         boolean not null default true,
  created_at     timestamptz not null default now()
);

create index idx_payout_accounts_worker on public.payout_accounts (worker_id, active);

alter table public.payout_accounts enable row level security;

create policy "payout_accounts own or admin" on public.payout_accounts
  for select using (
    auth_role() = 'admin'
    or worker_id in (select id from public.workers where profile_id = auth.uid())
  );

create policy "payout_accounts insert self" on public.payout_accounts
  for insert with check (
    worker_id in (select id from public.workers where profile_id = auth.uid())
  );

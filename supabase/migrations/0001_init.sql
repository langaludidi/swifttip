-- ============================================================================
-- SwiftTip — initial schema, RLS & auth wiring
-- Run in the Supabase SQL editor (Dashboard → SQL → New query) or via the CLI:
--   supabase db push
-- Money is stored as integer cents (bigint). Never use floats for money.
-- ============================================================================

-- ---------- enums ----------
create type user_role        as enum ('worker', 'employer', 'admin');
create type tx_type          as enum ('tip', 'withdrawal', 'fee', 'refund', 'adjustment');
create type payment_status   as enum ('pending', 'succeeded', 'failed', 'refunded');
create type payout_status    as enum ('pending', 'processing', 'completed', 'rejected');
create type kyc_status       as enum ('pending', 'approved', 'rejected');
create type payment_gateway  as enum ('ozow', 'payfast', 'payshap', 'snapscan');

-- ---------- profiles (1:1 with auth.users) ----------
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        user_role not null default 'worker',
  full_name   text,
  phone       text,
  email       text,
  created_at  timestamptz not null default now()
);

-- Create a profile automatically on signup. The role comes from the signup
-- metadata: supabase.auth.signUp({ ..., options: { data: { role: 'employer' } } })
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, role, full_name, phone, email)
  values (
    new.id,
    coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'worker'),
    new.raw_user_meta_data ->> 'full_name',
    new.phone,
    new.email
  );
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Helper: current user's role (used in policies)
create or replace function auth_role()
returns user_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

-- ---------- core tables ----------
create table employers (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid references profiles(id),
  legal_name  text not null,
  trading_name text,
  cipc_no     text,
  plan        text not null default 'free',
  verified    boolean not null default false,
  created_at  timestamptz not null default now()
);

create table workers (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references profiles(id) on delete cascade,
  employer_id uuid references employers(id),
  job_title   text,
  station     text,
  verified    boolean not null default false,
  rating_avg  numeric(2,1) default 0,
  created_at  timestamptz not null default now()
);

create table wallets (
  id            uuid primary key default gen_random_uuid(),
  worker_id     uuid not null unique references workers(id) on delete cascade,
  balance_cents bigint not null default 0,
  currency      char(3) not null default 'ZAR'
);

create table payments (
  id           uuid primary key default gen_random_uuid(),
  gateway      payment_gateway not null,
  gateway_ref  text,
  status       payment_status not null default 'pending',
  amount_cents bigint not null,
  created_at   timestamptz not null default now()
);

create table tips (
  id           uuid primary key default gen_random_uuid(),
  worker_id    uuid not null references workers(id),
  payment_id   uuid references payments(id),
  amount_cents bigint not null,
  fee_cents    bigint not null default 0,
  net_cents    bigint not null,
  created_at   timestamptz not null default now()
);

create table ledger_entries (
  id            uuid primary key default gen_random_uuid(),
  wallet_id     uuid not null references wallets(id) on delete cascade,
  type          tx_type not null,
  amount_cents  bigint not null,           -- signed: credit +, debit -
  balance_after bigint not null,
  ref_id        uuid,
  description   text,
  created_at    timestamptz not null default now()
);

create table withdrawals (
  id           uuid primary key default gen_random_uuid(),
  wallet_id    uuid not null references wallets(id),
  amount_cents bigint not null,
  fee_cents    bigint not null default 0,
  bank_ref     text,
  status       payout_status not null default 'pending',
  created_at   timestamptz not null default now()
);

create table compliments (
  id        uuid primary key default gen_random_uuid(),
  tip_id    uuid references tips(id),
  worker_id uuid not null references workers(id),
  rating    smallint check (rating between 1 and 5),
  message   text,
  created_at timestamptz not null default now()
);

create table qr_codes (
  id        uuid primary key default gen_random_uuid(),
  worker_id uuid not null references workers(id) on delete cascade,
  slug      text not null unique,
  active    boolean not null default true
);

create table kyc_documents (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  doc_type   text not null,
  storage_path text,
  status     kyc_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table audit_logs (
  id         uuid primary key default gen_random_uuid(),
  actor_id   uuid references profiles(id),
  action     text not null,
  meta       jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- Row-Level Security — the real boundary. Frontend guards are UX only.
-- ============================================================================
alter table profiles       enable row level security;
alter table employers      enable row level security;
alter table workers        enable row level security;
alter table wallets        enable row level security;
alter table tips           enable row level security;
alter table ledger_entries enable row level security;
alter table withdrawals    enable row level security;
alter table compliments    enable row level security;
alter table qr_codes       enable row level security;
alter table kyc_documents  enable row level security;

-- profiles: a user sees/edits only their own; admins see all
create policy "own profile"   on profiles for select using (id = auth.uid() or auth_role() = 'admin');
create policy "update own profile" on profiles for update using (id = auth.uid());

-- workers: the worker sees their own row; their employer sees their team; admin sees all
create policy "worker self/employer/admin" on workers for select using (
  profile_id = auth.uid()
  or auth_role() = 'admin'
  or employer_id in (select id from employers where owner_id = auth.uid())
);

-- wallet & ledger: only the owning worker (or admin)
create policy "own wallet" on wallets for select using (
  auth_role() = 'admin' or worker_id in (select id from workers where profile_id = auth.uid())
);
create policy "own ledger" on ledger_entries for select using (
  auth_role() = 'admin' or wallet_id in (
    select w.id from wallets w join workers wk on wk.id = w.worker_id where wk.profile_id = auth.uid()
  )
);

-- tips: worker sees own; employer sees team; admin all
create policy "tips visibility" on tips for select using (
  auth_role() = 'admin'
  or worker_id in (select id from workers where profile_id = auth.uid())
  or worker_id in (select id from workers where employer_id in (select id from employers where owner_id = auth.uid()))
);

-- qr codes are public-read (customers scan them without auth)
create policy "qr public read" on qr_codes for select using (true);

-- compliments are public-read; only the system writes them (service role)
create policy "compliments public read" on compliments for select using (true);

-- NOTE: writes to wallets/tips/payments/ledger must go through Edge Functions
-- using the service role key — never grant insert/update to anon or authenticated.

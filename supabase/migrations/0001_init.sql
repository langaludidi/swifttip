-- ============================================================================
-- SwiftTip — init schema, reconciled against Edge Functions + src/services
-- Money = integer cents. Writes to money tables via service role only.
-- ============================================================================

create type user_role as enum ('worker', 'employer', 'admin');

-- ---------- profiles ----------
create table profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  role       user_role not null default 'worker',
  full_name  text,
  phone      text,
  email      text,
  created_at timestamptz not null default now()
);

create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, role, full_name, phone, email)
  values (
    new.id,
    coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'worker'),
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'phone',
    new.email
  );
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

create or replace function auth_role()
returns user_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

-- ---------- employers ----------
create table employers (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid references profiles(id),
  name       text not null,
  created_at timestamptz not null default now()
);

-- ---------- workers ----------
-- display_name: shown on the PUBLIC tip page so profiles (with phone) never
-- needs a public read policy. Frontend: getWorkerBySlug should use this
-- instead of embedding profiles(full_name, phone).
create table workers (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid references profiles(id) on delete cascade,
  employer_id  uuid references employers(id),
  display_name text,
  slug         text unique,
  job_title    text,
  station      text,
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

-- ---------- wallets (owner_id = workers.id, per request-payout) ----------
create table wallets (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null unique references workers(id) on delete cascade,
  balance_cents bigint not null default 0 check (balance_cents >= 0),
  currency      char(3) not null default 'ZAR',
  updated_at    timestamptz not null default now()
);

create or replace function handle_new_worker()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.wallets (owner_id) values (new.id);
  return new;
end; $$;

create trigger on_worker_created
  after insert on workers
  for each row execute function handle_new_worker();

-- ---------- tips (cols per create-tip) ----------
create table tips (
  id               uuid primary key default gen_random_uuid(),
  worker_id        uuid not null references workers(id),
  amount_cents     bigint not null check (amount_cents > 0),
  note             text,
  customer_session text,
  status           text not null default 'pending'
                   check (status in ('pending', 'settled', 'failed')),
  gateway_ref      text unique,           -- Paystack reference (webhook workstream)
  settled_at       timestamptz,
  created_at       timestamptz not null default now()
);

-- ---------- payouts (cols per request-payout / set-payout-status / frontend) ----------
create table payouts (
  id           uuid primary key default gen_random_uuid(),
  worker_id    uuid not null references workers(id),
  amount_cents bigint not null check (amount_cents > 0),
  status       text not null default 'requested'
               check (status in ('requested', 'approved', 'paid', 'rejected')),
  requested_at timestamptz not null default now(),
  settled_at   timestamptz
);

-- ---------- ledger (cols per request-payout: kind, payout_id) ----------
create table ledger_entries (
  id           uuid primary key default gen_random_uuid(),
  wallet_id    uuid not null references wallets(id) on delete cascade,
  tip_id       uuid references tips(id),
  payout_id    uuid references payouts(id),
  kind         text not null check (kind in ('credit', 'debit')),
  amount_cents bigint not null,
  created_at   timestamptz not null default now()
);

-- ---------- compliments (cols per leave-compliment service) ----------
create table compliments (
  id         uuid primary key default gen_random_uuid(),
  tip_id     uuid references tips(id),
  stars      smallint check (stars between 1 and 5),
  note       text,
  created_at timestamptz not null default now()
);

-- ---------- indexes ----------
create index idx_tips_worker      on tips (worker_id, created_at desc);
create index idx_payouts_worker   on payouts (worker_id, requested_at desc);
create index idx_payouts_pending  on payouts (status) where status in ('requested','approved');
create index idx_ledger_wallet    on ledger_entries (wallet_id, created_at desc);
create index idx_workers_employer on workers (employer_id);
create index idx_workers_slug     on workers (slug);

-- ============================================================================
-- settle_tip(tip_id) — exact signature the Edge Functions call.
-- Idempotent: settling a settled tip is a no-op. Service role only.
-- ============================================================================
create or replace function settle_tip(tip_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_tip    tips%rowtype;
  v_wallet wallets%rowtype;
begin
  select * into v_tip from tips where id = tip_id for update;
  if not found then
    raise exception 'tip % not found', tip_id;
  end if;
  if v_tip.status = 'settled' then
    return;  -- idempotent
  end if;

  update tips set status = 'settled', settled_at = now() where id = tip_id;

  select * into v_wallet from wallets where owner_id = v_tip.worker_id for update;
  if not found then
    raise exception 'no wallet for worker %', v_tip.worker_id;
  end if;

  update wallets
     set balance_cents = balance_cents + v_tip.amount_cents,
         updated_at = now()
   where id = v_wallet.id;

  insert into ledger_entries (wallet_id, tip_id, kind, amount_cents)
  values (v_wallet.id, tip_id, 'credit', v_tip.amount_cents);
end; $$;

revoke execute on function settle_tip(uuid) from public, anon, authenticated;

-- ============================================================================
-- RLS — every table
-- ============================================================================
alter table profiles       enable row level security;
alter table employers      enable row level security;
alter table workers        enable row level security;
alter table wallets        enable row level security;
alter table tips           enable row level security;
alter table payouts        enable row level security;
alter table ledger_entries enable row level security;
alter table compliments    enable row level security;

-- profiles: own + admin. NO public read (phone lives here).
create policy "profiles own or admin" on profiles
  for select using (id = auth.uid() or auth_role() = 'admin');
create policy "profiles update own" on profiles
  for update using (id = auth.uid());

-- employers
create policy "employers owner or admin" on employers
  for select using (owner_id = auth.uid() or auth_role() = 'admin');
create policy "employers insert own" on employers
  for insert with check (owner_id = auth.uid());

-- workers: active workers publicly readable (tip page); full row for
-- self / employer / admin
create policy "workers public active read" on workers
  for select using (
    active = true
    or profile_id = auth.uid()
    or auth_role() = 'admin'
    or employer_id in (select id from employers where owner_id = auth.uid())
  );
create policy "workers employer or admin update" on workers
  for update using (
    auth_role() = 'admin'
    or employer_id in (select id from employers where owner_id = auth.uid())
  );

-- wallets: owning worker + their employer (dashboard join) + admin
create policy "wallets owner employer admin" on wallets
  for select using (
    auth_role() = 'admin'
    or owner_id in (select id from workers where profile_id = auth.uid())
    or owner_id in (
      select id from workers where employer_id in
        (select id from employers where owner_id = auth.uid())
    )
  );

-- tips: worker's own + employer + admin
create policy "tips visibility" on tips
  for select using (
    auth_role() = 'admin'
    or worker_id in (select id from workers where profile_id = auth.uid())
    or worker_id in (
      select id from workers where employer_id in
        (select id from employers where owner_id = auth.uid())
    )
  );

-- payouts: worker's own + admin (getAllPayouts is the admin screen)
create policy "payouts own or admin" on payouts
  for select using (
    auth_role() = 'admin'
    or worker_id in (select id from workers where profile_id = auth.uid())
  );

-- ledger: owning worker + admin
create policy "ledger own or admin" on ledger_entries
  for select using (
    auth_role() = 'admin'
    or wallet_id in (
      select w.id from wallets w
      join workers wk on wk.id = w.owner_id
      where wk.profile_id = auth.uid()
    )
  );

-- compliments: public read
create policy "compliments public read" on compliments
  for select using (true);

-- All writes to wallets/tips/payouts/ledger happen via Edge Functions
-- (service role) or settle_tip. No insert/update policies for users. Correct.

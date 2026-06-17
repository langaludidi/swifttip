-- SwiftTip initial schema
-- Cents + double-entry ledger. NEVER store rands as floats.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  text NOT NULL,
  phone      text,
  role       text NOT NULL CHECK (role IN ('worker', 'employer', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Wallets (one per worker profile)
CREATE TABLE wallets (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  balance_cents bigint NOT NULL DEFAULT 0 CHECK (balance_cents >= 0),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id)
);

-- Workers (extends profiles for workers)
CREATE TABLE workers (
  id           uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  slug         text UNIQUE NOT NULL,
  employer_id  uuid REFERENCES profiles(id),
  venue        text,
  role_title   text,
  avatar_color text DEFAULT 'teal',
  qr_url       text,
  active       boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Tips
CREATE TABLE tips (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id        uuid NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  customer_session uuid,
  amount_cents     bigint NOT NULL CHECK (amount_cents > 0),
  note             text,
  status           text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'settled', 'refunded')),
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- Ledger entries (double-entry)
CREATE TABLE ledger_entries (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id    uuid NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  tip_id       uuid REFERENCES tips(id),
  payout_id    uuid,                         -- FK added after payouts table
  kind         text NOT NULL CHECK (kind IN ('credit', 'debit')),
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Payouts
CREATE TABLE payouts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id    uuid NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  status       text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'approved', 'paid', 'rejected')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  settled_at   timestamptz
);

-- FK from ledger_entries to payouts (added after payouts table exists)
ALTER TABLE ledger_entries ADD CONSTRAINT ledger_entries_payout_id_fkey
  FOREIGN KEY (payout_id) REFERENCES payouts(id);

-- Compliments
CREATE TABLE compliments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tip_id     uuid NOT NULL REFERENCES tips(id) ON DELETE CASCADE,
  stars      int NOT NULL CHECK (stars BETWEEN 1 AND 5),
  note       text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tip_id)
);

-- ── RLS ──────────────────────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliments ENABLE ROW LEVEL SECURITY;

-- Profiles: own row
CREATE POLICY "profiles_own" ON profiles FOR ALL USING (auth.uid() = id);

-- Wallets: own wallet
CREATE POLICY "wallets_own" ON wallets FOR ALL USING (auth.uid() = owner_id);

-- Workers: own worker row; employers see their team; admins see all
CREATE POLICY "workers_own" ON workers FOR SELECT USING (auth.uid() = id);
CREATE POLICY "workers_employer" ON workers FOR SELECT
  USING (employer_id = auth.uid());
CREATE POLICY "workers_admin" ON workers FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "workers_own_update" ON workers FOR UPDATE USING (auth.uid() = id);

-- Tips: workers see their own; anon can INSERT (customer tips without account)
CREATE POLICY "tips_worker_select" ON tips FOR SELECT USING (
  worker_id IN (SELECT id FROM workers WHERE id = auth.uid())
);
CREATE POLICY "tips_anon_insert" ON tips FOR INSERT WITH CHECK (true);
CREATE POLICY "tips_admin" ON tips FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Ledger: workers see their own wallet entries
CREATE POLICY "ledger_own" ON ledger_entries FOR SELECT
  USING (wallet_id IN (SELECT id FROM wallets WHERE owner_id = auth.uid()));
CREATE POLICY "ledger_admin" ON ledger_entries FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Payouts: workers see / insert their own; admins update
CREATE POLICY "payouts_worker" ON payouts FOR SELECT USING (
  worker_id IN (SELECT id FROM workers WHERE id = auth.uid())
);
CREATE POLICY "payouts_worker_insert" ON payouts FOR INSERT WITH CHECK (
  worker_id IN (SELECT id FROM workers WHERE id = auth.uid())
);
CREATE POLICY "payouts_admin" ON payouts FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Compliments: anon insert; workers see their own
CREATE POLICY "compliments_insert" ON compliments FOR INSERT WITH CHECK (true);
CREATE POLICY "compliments_worker" ON compliments FOR SELECT
  USING (tip_id IN (SELECT id FROM tips WHERE worker_id = auth.uid()));
CREATE POLICY "compliments_admin" ON compliments FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ── Auto-create profile + wallet on user sign-up ─────────

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role text;
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'worker');
  INSERT INTO profiles (id, full_name, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'phone',
    v_role
  );
  IF v_role = 'worker' THEN
    INSERT INTO wallets (owner_id) VALUES (NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- 0004 — payouts: atomic request + status transitions, and withdrawals RLS
-- Run after 0003. Money debits/credits are double-entry and run only via the
-- service role (Edge Functions request-payout / set-payout-status).
-- ============================================================================

-- Worker requests a payout: validate, lock the wallet, debit it, record the
-- withdrawal + a signed ledger entry — all atomically. Returns the withdrawal.
create or replace function request_payout(p_worker uuid, p_amount_cents bigint, p_bank_ref text default null)
returns withdrawals
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet wallets%rowtype;
  v_fee    bigint := 250;   -- R2.50 flat payout fee
  v_new    bigint;
  v_wd     withdrawals%rowtype;
begin
  if p_amount_cents < 2000 then
    raise exception 'Minimum payout is R20.00';
  end if;

  select * into v_wallet from wallets where worker_id = p_worker for update;
  if not found then
    raise exception 'wallet not found for worker %', p_worker;
  end if;

  if v_wallet.balance_cents < p_amount_cents then
    raise exception 'Insufficient balance';
  end if;

  v_new := v_wallet.balance_cents - p_amount_cents;
  update wallets set balance_cents = v_new where id = v_wallet.id;

  insert into withdrawals (wallet_id, amount_cents, fee_cents, bank_ref, status)
  values (v_wallet.id, p_amount_cents, v_fee, p_bank_ref, 'pending')
  returning * into v_wd;

  insert into ledger_entries (wallet_id, type, amount_cents, balance_after, ref_id, description)
  values (v_wallet.id, 'withdrawal', -p_amount_cents, v_new, v_wd.id, 'Payout requested');

  return v_wd;
end;
$$;

-- Admin transitions a payout's status. Rejecting a not-yet-completed payout
-- refunds the wallet (credit + ledger entry) atomically.
create or replace function set_payout_status(p_id uuid, p_status payout_status)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wd     withdrawals%rowtype;
  v_wallet wallets%rowtype;
  v_new    bigint;
begin
  select * into v_wd from withdrawals where id = p_id for update;
  if not found then
    raise exception 'withdrawal % not found', p_id;
  end if;
  if v_wd.status = p_status then
    return; -- idempotent
  end if;

  if p_status = 'rejected' and v_wd.status in ('pending', 'processing') then
    select * into v_wallet from wallets where id = v_wd.wallet_id for update;
    v_new := v_wallet.balance_cents + v_wd.amount_cents;
    update wallets set balance_cents = v_new where id = v_wallet.id;
    insert into ledger_entries (wallet_id, type, amount_cents, balance_after, ref_id, description)
    values (v_wallet.id, 'refund', v_wd.amount_cents, v_new, v_wd.id, 'Payout rejected — refunded');
  end if;

  update withdrawals set status = p_status where id = p_id;
end;
$$;

-- These run only via the service role in Edge Functions.
revoke all on function request_payout(uuid, bigint, text) from anon, authenticated;
revoke all on function set_payout_status(uuid, payout_status) from anon, authenticated;

-- Workers (and admins) can READ their own withdrawals for the history screen.
-- (Writes remain service-role-only — no insert/update policy is granted.)
create policy "own withdrawals" on withdrawals for select using (
  auth_role() = 'admin'
  or wallet_id in (
    select w.id from wallets w
    join workers wk on wk.id = w.worker_id
    where wk.profile_id = auth.uid()
  )
);

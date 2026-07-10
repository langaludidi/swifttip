-- ============================================================================
-- 0002 — atomic tip settlement (double-entry) + config
-- Run after 0001_init.sql.
-- ============================================================================

-- Credit a worker's wallet for a successful payment, exactly once.
-- Called by the ozow-webhook Edge Function via supabase.rpc('settle_tip', …).
create or replace function settle_tip(p_ref text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment payments%rowtype;
  v_tip     tips%rowtype;
  v_wallet  wallets%rowtype;
  v_new     bigint;
begin
  -- lock the payment row
  select * into v_payment from payments where gateway_ref = p_ref for update;
  if not found then
    raise exception 'payment % not found', p_ref;
  end if;

  -- idempotent: if already settled, do nothing
  if v_payment.status = 'succeeded' then
    return;
  end if;

  update payments set status = 'succeeded' where id = v_payment.id;

  select * into v_tip from tips where payment_id = v_payment.id;
  if not found then
    raise exception 'tip for payment % not found', p_ref;
  end if;

  -- ensure the worker has a wallet, then credit it
  select * into v_wallet from wallets where worker_id = v_tip.worker_id for update;
  if not found then
    insert into wallets (worker_id, balance_cents) values (v_tip.worker_id, 0)
    returning * into v_wallet;
  end if;

  v_new := v_wallet.balance_cents + v_tip.net_cents;
  update wallets set balance_cents = v_new where id = v_wallet.id;

  insert into ledger_entries (wallet_id, type, amount_cents, balance_after, ref_id, description)
  values (v_wallet.id, 'tip', v_tip.net_cents, v_new, v_tip.id, 'Tip received');
end;
$$;

-- settle_tip is invoked only by the service role (Edge Function); never exposed to clients.
revoke all on function settle_tip(text) from anon, authenticated;

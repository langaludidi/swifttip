-- Atomic settle_tip stored procedure
-- Called by the create-tip and settle-tip Edge Functions (SECURITY DEFINER)

CREATE OR REPLACE FUNCTION settle_tip(tip_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_worker_id   uuid;
  v_amount_cents bigint;
  v_wallet_id   uuid;
BEGIN
  -- Lock the tip row so concurrent calls can't double-credit
  SELECT worker_id, amount_cents
    INTO v_worker_id, v_amount_cents
    FROM tips
   WHERE id = tip_id AND status = 'pending'
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'tip % not found or already settled', tip_id;
  END IF;

  -- Resolve wallet
  SELECT id INTO v_wallet_id FROM wallets WHERE owner_id = v_worker_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'wallet not found for worker %', v_worker_id;
  END IF;

  -- Credit wallet (atomic)
  UPDATE wallets
     SET balance_cents = balance_cents + v_amount_cents,
         updated_at    = now()
   WHERE id = v_wallet_id;

  -- Ledger credit entry
  INSERT INTO ledger_entries (wallet_id, tip_id, kind, amount_cents)
  VALUES (v_wallet_id, tip_id, 'credit', v_amount_cents);

  -- Mark tip as settled
  UPDATE tips SET status = 'settled' WHERE id = tip_id;
END;
$$;

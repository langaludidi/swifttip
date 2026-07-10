-- ============================================================================
-- 0003 — add Paystack to the payment_gateway enum
-- Run BEFORE 0004 and before deploying the Paystack functions.
-- NOTE: ALTER TYPE ... ADD VALUE must be committed before the new value is used
-- in data. Run this migration on its own (the Supabase SQL editor auto-commits
-- each statement; `supabase db push` applies files in order).
-- ============================================================================
alter type payment_gateway add value if not exists 'paystack';

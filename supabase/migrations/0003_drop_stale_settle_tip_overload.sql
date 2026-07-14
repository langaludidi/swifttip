-- ============================================================================
-- A leftover settle_tip(p_ref text) overload from an earlier schema design
-- (referencing a `payments` table that no longer exists) was still live
-- alongside the correct settle_tip(tip_id uuid). It always errors if called,
-- and is dead weight now that nothing references the old `payments`/`worker_id`
-- shape. Dropping it removes the ambiguity/landmine for any future caller
-- that invokes settle_tip with an untyped argument.
-- ============================================================================
drop function if exists public.settle_tip(text);

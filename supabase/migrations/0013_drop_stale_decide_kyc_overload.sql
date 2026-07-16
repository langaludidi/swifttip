-- ============================================================================
-- Drift incident #3 (after settle_tip in 0003, the kyc bucket in 0006): a
-- SECOND decide_kyc overload — decide_kyc(uuid, text, uuid, text) — exists
-- live in the database with EXECUTE never revoked from anon/authenticated,
-- and was never created by any migration file. Found via
-- get_advisors(type: security), which had never been run on this project
-- before now.
--
-- Worse than the other two drift incidents: it needs no session at all (anon
-- EXECUTE — a curl call, not even a signup), and its body writes to
-- kyc_submissions/workers.verified, neither of which currently exist. Those
-- two objects are exactly what the design-reference build's 0006_kyc.sql
-- would create if ever ported (queued as a Sprint A tail item) — landing
-- that port without this fix would silently reactivate an anonymous,
-- zero-auth KYC-approval bypass, and introduce a second, competing
-- verification concept (`verified`) alongside worker_status.
--
-- Dropping only this exact stale signature. The real decide_kyc(uuid,
-- worker_status, text, uuid) — created in 0010_kyc_review.sql, EXECUTE
-- already revoked from public/anon/authenticated there — is untouched.
-- ============================================================================
drop function if exists public.decide_kyc(uuid, text, uuid, text);

-- ============================================================================
-- Hygiene: these three are SECURITY DEFINER trigger functions (`returns
-- trigger`), meant to run only via their bound triggers. Calling them
-- directly via /rest/v1/rpc/... errors at runtime ("trigger functions can
-- only be called as triggers") since they reference the trigger-only `new`
-- record — so the broad anon/authenticated EXECUTE grant they carry is inert,
-- not exploitable. But the grant itself is still wrong and worth closing as
-- belt-and-suspenders. auth_role() is deliberately left alone: it's a plain
-- read-only function (returns only the caller's own role) that RLS policy
-- expressions themselves call, so it must stay executable by anon/authenticated.
-- ============================================================================
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_new_worker() from public, anon, authenticated;
revoke execute on function public.prevent_self_role_change() from public, anon, authenticated;

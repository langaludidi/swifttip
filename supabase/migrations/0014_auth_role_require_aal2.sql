-- ============================================================================
-- H2 / admin MFA, layer 2 of 2. Layer 1 (0013 not needed here — see the
-- review-kyc and set-payout-status edge function changes shipped alongside
-- this migration) gates the actual privileged actions directly, since those
-- run under the service role and never touch RLS or this function at all.
-- This layer closes the remaining gap: any DIRECT client read gated by an
-- `auth_role() = 'admin'` RLS policy (kyc_documents metadata, audit_logs,
-- workers, payout_accounts) — an aal1 admin session (e.g. a hijacked token)
-- must not pass those checks either.
--
-- `auth_role()` now returns 'admin' only when the session's own JWT `aal`
-- claim is 'aal2' AND the caller's profile role is 'admin'. For every other
-- role (worker, employer) it is completely unaffected — proven live with a
-- throwaway worker account before this was written: aal1, no MFA, still
-- returns 'worker' correctly. Workers never enroll MFA and are never subject
-- to this at all; only the 'admin' return value is gated.
--
-- Recovery if this ever locks the admin account out at the database layer:
-- a direct Postgres connection (Supabase SQL Editor, or any service-role /
-- superuser connection) never goes through PostgREST's `authenticated` role
-- and has no `request.jwt.claims` GUC set at all — `auth.jwt()->>'aal'` is
-- NULL there, `coalesce(..., 'aal1')` falls back to 'aal1', which fails the
-- aal2 check, so a raw SQL admin session working directly against the
-- database can always bypass this function's RLS-gated effect entirely by
-- querying tables directly (RLS doesn't apply to that connection either) —
-- this is the intended break-glass path, not a bug in this function.
-- ============================================================================
create or replace function auth_role()
returns user_role language sql stable security definer set search_path = public as $$
  select case
    when (select role from public.profiles where id = auth.uid()) = 'admin'
         and coalesce((select auth.jwt()->>'aal'), 'aal1') = 'aal2'
      then 'admin'::user_role
    when (select role from public.profiles where id = auth.uid()) = 'admin'
      then null
    else (select role from public.profiles where id = auth.uid())
  end
$$;

-- ============================================================================
-- C6: "profiles update own" (0001_init.sql) is `for update using (id =
-- auth.uid())` with no WITH CHECK, which defaults to the same USING
-- expression — that only restricts WHICH ROW can be touched, never WHICH
-- COLUMNS. Any authenticated user could PATCH their own `role` column
-- directly to 'admin' in one request. Live-proven (2026-07-16/17) with a
-- throwaway account and only the anon key: PATCH /rest/v1/profiles?id=eq.<own
-- uid> {"role":"admin"} returned HTTP 200 with role: "admin". This is a
-- distinct, separate gap from C4 (which only fixed signup-time
-- raw_user_meta_data trust) — C4 left this ongoing-UPDATE vector completely
-- untouched. More severe than C5: this grants full platform admin, not one
-- worker's active flag, and unwinds every auth_role() = 'admin' check in the
-- system, including C5's own fix.
--
-- A naive WITH CHECK can't catch this: USING and WITH CHECK on UPDATE are
-- evaluated against different row snapshots (old vs. new) and can't be
-- compared against each other inside a single RLS policy expression. A
-- BEFORE UPDATE trigger is used instead — it receives OLD and NEW as two
-- concrete records in the same execution, no snapshot ambiguity.
--
-- Gate is auth.role() (Supabase's built-in JWT-role-claim function — 'anon' /
-- 'authenticated' / 'service_role' — NOT this app's own public.auth_role(),
-- which reads profiles.role for app-level RBAC; easy to confuse the two).
-- Only blocks role changes when the request came in as 'authenticated' via
-- PostgREST (a normal end-user session). service_role requests, and direct
-- SQL connections with no PostgREST/JWT context at all (auth.role() is NULL
-- there), are both left untouched — service-role/SQL-based admin promotion
-- must keep working.
-- ============================================================================
create or replace function public.prevent_self_role_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role and auth.role() = 'authenticated' then
    raise exception 'role cannot be changed via a direct client update';
  end if;
  return new;
end; $$;

drop trigger if exists profiles_prevent_self_role_change on public.profiles;
create trigger profiles_prevent_self_role_change
  before update on public.profiles
  for each row execute function public.prevent_self_role_change();

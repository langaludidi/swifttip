-- ============================================================================
-- Caught by get_advisors immediately after 0015 shipped: unlike decide_kyc,
-- enforce_worker_active_matches_status() was created without a fixed
-- search_path, so it's vulnerable to search_path hijacking (a role that can
-- create objects in a schema earlier in its search_path could shadow an
-- identifier the function resolves unqualified). The function only touches
-- NEW/OLD record fields today so there's nothing to hijack in practice, but
-- fixing it now costs nothing and matches every other function in this
-- schema. Exactly the kind of drift get_advisors exists to catch — this is
-- that habit working as intended, not a new incident.
-- ============================================================================
create or replace function enforce_worker_active_matches_status()
returns trigger language plpgsql set search_path = public as $$
begin
  new.active := (new.status = 'approved');
  return new;
end; $$;

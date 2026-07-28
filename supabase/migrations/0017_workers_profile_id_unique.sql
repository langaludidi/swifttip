-- ============================================================================
-- One worker profile per identity, enforced at the database level. Prior to
-- this, workers.profile_id had no uniqueness constraint at all, which let a
-- signup-while-logged-in bug (fixed in application code separately) silently
-- pile up multiple `workers` rows under the same profile_id instead of
-- failing on the second attempt. That bug already produced 8 stray rows
-- under one identity in this live database before it was noticed — cleaned
-- up manually before this migration (7 draft rows deleted, one legitimate
-- approved row kept as a test fixture).
--
-- NULL is intentionally still allowed to repeat (standard SQL UNIQUE
-- semantics: NULLs never conflict with each other) — `workers.profile_id`
-- is nullable and at least one internal test fixture uses NULL deliberately
-- (a worker row created directly for tip-page testing, with no real
-- identity attached). This constraint only ever bites on a real duplicate
-- identity, never on synthetic no-identity rows.
-- ============================================================================
alter table public.workers
  add constraint workers_profile_id_unique unique (profile_id);

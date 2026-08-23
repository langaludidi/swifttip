# SwiftTip MVP v3 — Security Hardening 0043

Status: **Applied and verified**

Canonical database: `bxtfcfuehqljedxwykfk`

Migration: `mvp_v3_0043_authenticated_dml_surface_hardening`

Regression suite: `011_client_privilege_hardening`

## Purpose

SwiftTip's canonical write paths are RPC/server controlled. The public tables used by Workers, Venues, Admins and Customer transaction processing had RLS protections, but Supabase's default `public`-schema ACLs still gave `anon` and `authenticated` broad table privileges such as INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES and TRIGGER.

Those grants were not a working bypass because no matching client write RLS policies existed. They were nevertheless unnecessary attack surface: a future mistaken RLS policy could have converted an otherwise harmless ACL into a direct mutation path.

Migration 0043 adds an independent table-privilege boundary.

## Current table privilege model

For the following authoritative tables, direct client writes are no longer available:

- `admin_memberships`
- `disputes`
- `financial_allocations`
- `notifications`
- `payment_attempts`
- `pilot_cohort_venues`
- `pilot_cohorts`
- `pricing_versions`
- `provider_settlement_profiles`
- `refunds`
- `settlements`
- `support_cases`
- `terms_acceptances`
- `tips`
- `user_profiles`
- `venue_memberships`
- `venues`
- `worker_tipping_endpoints`
- `worker_venue_associations`
- `worker_verifications`
- `workers`

`anon` now has **no direct table privileges** on these tables.

`authenticated` now has **SELECT only**. RLS remains the independent row-visibility boundary.

`terms_versions` remains RPC-only and receives no direct `anon` or `authenticated` table grant.

`service_role` retains authoritative access for controlled server/provider operations.

## Future-object defaults

SwiftTip migrations are created by the `postgres` role. Migration 0043 changes `postgres` default privileges in the `public` schema so new SwiftTip objects no longer automatically expose themselves to client roles:

- new tables: no automatic `anon`/`authenticated` privileges;
- new functions: no automatic `anon`/`authenticated` EXECUTE;
- new sequences: no automatic `anon`/`authenticated` privileges.

Every future client-accessible object must therefore be explicitly granted by its migration.

Supabase-managed `supabase_admin` defaults were not changed because the SwiftTip migration role is not a member of `supabase_admin`. This keeps the hardening scoped to SwiftTip-owned objects rather than altering platform-managed defaults.

## Verification

Regression suite 011 executed against the canonical project and returned:

`011_client_privilege_hardening: PASS`

It verifies:

- authenticated SELECT access remains available where required;
- authenticated INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER are absent;
- anonymous direct table privileges are absent;
- `terms_versions` remains RPC-only;
- `service_role` authoritative access remains available;
- intended anonymous Customer RPCs remain executable;
- intended Worker/Admin RPCs remain executable; and
- `postgres` future table/function/sequence defaults no longer include `anon` or `authenticated`.

The post-migration Supabase security advisor produced no new table privilege/RLS exposure. Remaining SECURITY DEFINER notices correspond to intentionally callable RPCs and continue to require their own ownership, role/AAL2, high-entropy token, legal-readiness, or transaction-intake controls as applicable.

## Runtime effect

No public money path was activated by this change.

The public Tip intake switch remains OFF, pricing remains inactive, legal documents remain unpublished, and no payment provider is configured.

## Build evidence

The greenfield Vercel Preview deployment for commit `2d2f94534f8371c861191fcddfb8730a3ea4b69f` completed with state **READY**.

This is a Preview deployment from `mvp-v3-greenfield-build`, not a Production promotion.

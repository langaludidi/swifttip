# Neon migration preparation

This directory prepares the existing SwiftTip backend for migration. It is not an
executable replacement backend or authorization to cut over. Existing Supabase
runtime code and legacy SQL are unchanged.

## Repeatable dependency inventory

Run `npm run backend:inventory --silent > /tmp/swifttip-backend-inventory.json`.
The TypeScript AST inventory records source/tooling call sites, including dynamic
arguments, and SQL platform references. It excludes test fixtures and never reads
environment files or data. Storage operations invoked through a variable still
require review of that caller; this is not complete dataflow analysis or a SQL parser.

The inspected baseline has 76 literal RPC names, five directly queried relations
(`workers`, `worker_verifications`, `venue_memberships`, `venues`,
`admin_memberships`) and 160 recognized call sites across database, auth and storage.
These are inventory counts, not runtime coverage. Full per-RPC callers and function
definitions are in the generated output rather than a second hand-maintained list.

`legacy-migrations.json` pins SHA-256 checksums for all 56 original migrations at
the reference commit. `npm run backend:baseline` is included in CI and rejects
rewriting or deleting them. Future changes belong in additive, reviewed migrations;
updating this checksum manifest to conceal a rewrite is not a migration strategy.

## Replacement contracts

| Existing dependency | Replacement contract | Required proof before cutover |
| --- | --- | --- |
| SSR server client, 76 RPCs and direct queries | Parameterized PostgreSQL repositories with request-scoped transactions; retain SQL business rules | Each call is mapped; anonymous, worker, venue and admin fixtures retain their intended privileges. Queries execute with restricted roles, never the migration owner. |
| `auth.users` foreign keys and email/phone lookups | Canonical UUID identity mapping backed by selected auth service | Preserve all historical IDs and FKs. A new provider identity cannot overwrite/reassign an existing worker. Controlled imports and conflict handling are explicit. |
| `auth.uid()`, `auth.jwt()`, `auth.role()` | Server-verified identity context scoped to one transaction; domain helpers retain equivalent semantics | Claims cannot come from request JSON or unverified tokens; account role and MFA are checked against current server-side session proof. Context cannot leak between pooled requests. |
| `auth.sessions` and session access RPCs | Revocable persisted session records with creation, expiry and session-specific second-factor proof | Seven-day worker, 24-hour venue and eight-hour admin maximum ages; revocation fails closed. An account having TOTP configured does not prove the current session passed it. |
| Worker SMS OTP | Phone-first signup, E.164 validation, bounded OTP attempts, expiry and single use | Requesting a code creates no worker/domain privileges. Verification creates identity, not financial activation. Concurrent consumption must be proved on PostgreSQL, not memory mocks. |
| Venue/admin email OTP | Verified email session; invitation/membership remains independent authorization | New email auth users acquire no venue/admin permissions. Preserve administrator allowlisting and database RBAC. |
| Admin TOTP enrolment, challenges and recovery | Passwordless-capable TOTP with session-bound assurance, audited recovery and revocation | Both application and SQL deny admin work before proof; email OTP must not bypass TOTP. Enrolment, next-login challenge, expiry and recovery all need integration tests. |
| Cookie refresh, callback and sign-out | HttpOnly secure sessions, trusted origins, server validation and revocation | Reload, expiry and sign-out are tested; cached account claims cannot substitute for current session checks. |
| Private `worker-verification` bucket and `storage.objects` joins | Private S3-compatible objects plus an owned evidence metadata catalogue | Copy and reconcile IDs, keys, bytes, hashes, ownership, versions and deletion state. Object existence and authorization must both be verified before submission/review. |
| Signed evidence download | Short-lived server-authorized URLs after verification-admin permission and current MFA proof | No public bucket, no arbitrary object key, no venue access to documents; expiry and access-denial tests. |
| Provisioning and MFA recovery scripts | Explicit server-only operator tooling with separate database privileges | Cannot grant access from an ordinary request; every change is audited and financial history remains immutable. |
| `extensions`/pgcrypto resolution | Explicit supported extension schema/search paths | Crypto functions resolve under each definer's search path. Do not assume extension installation on Neon matches Supabase. |

Auth call inventory includes OTP request/verification, user lookup, claim validation,
sign-out, callback exchange, assurance lookup, factor list/enrol/challenge/delete,
and operator user create/list/get/delete. Storage paths include upload, deletion,
document registration/finalization and signed reviewer access. Replacing only the
database client would leave these controls broken.

## Verified target preflight

On 27 October 2026, read-only metadata queries on the explicitly selected isolated
development branch established:

- PostgreSQL 18.6; zero tables in `public`, `private` and `audit`.
- An existing `neon_auth` schema with managed-auth tables. The branch integration
  API reports managed Auth is not enabled. Existing tables were not changed.
- Only `plpgsql` installed; `pgcrypto` available but not installed. Core UUID
  generation is available.
- No `anon`, `authenticated` or `service_role` roles.
- The inspection/migration role bypasses RLS and can create roles. It must not be
  reused as the application's runtime connection.

`preflight.sql` reproduces a metadata-only schema/constraint inventory. It contains
no target IDs or credentials and does not count/read user records. Invoke it only
through a branch-scoped database tool or an independently verified development
connection; never allow omitted branch selection to fall back to production.

The development compute is fixed at 0.25 CU with a five-minute idle suspension.
No application migrations or data imports were applied. No database credentials
were retrieved. Private project/branch/endpoint identifiers are retained outside
this public repository.

## Auth feasibility result

Current Neon managed-auth documentation lists a constrained phone plugin (existing
users link a number), while MFA is not available in the managed plugin set. That
does not meet SwiftTip's phone-first registration plus existing administrator TOTP
requirements. Managed auth must not be enabled merely to make a migration compile.

A temporary isolated probe installed exact `better-auth@1.7.14` and exercised its
actual HTTP handler and memory adapter with synthetic identities and captured
delivery callbacks. No real SMS/email was sent. It established:

- Sending a phone OTP does not create a user.
- Correct OTP verification creates a UUID identity with a verified phone.
- Reusing the consumed code fails; invalid country formatting is rejected.
- An email-OTP account can enrol passwordless TOTP and verify it before it is enabled.
- **The required next-login MFA assertion failed:** subsequent `/sign-in/email-otp`
  returned an authenticated session rather than a `twoFactorRedirect` challenge.
  Inspection confirmed the plugin's automatic challenge matcher covers credential
  login paths, not this email-OTP route. Never treat TOTP-enabled account metadata
  or an email-OTP session as AAL2.

This makes self-managed Better Auth a candidate with an application-enforced
assurance requirement, not a verified drop-in replacement. The next auth integration
must prove that a new email-OTP session cannot perform administrator work until a
successful second-factor operation records proof for that exact session. Recovery
must revoke prior proof/sessions. Do not work around this by adding a mandatory
password journey or weakening the existing MFA requirement.

The memory probe does not establish PostgreSQL concurrency, persistence, distributed
rate limiting, secure hosted cookies or provider delivery. These remain acceptance
requirements. Root dependency installation was also rejected by npm peer resolution
because optional framework peers conflict with the existing Vite test dependency;
no forced dependency install, root package change or runtime auth switch was retained.
Resolve a reproducible compatible dependency set before integrating the candidate.

Sources checked on the assessment date:

- https://neon.com/docs/auth/guides/plugins
- https://neon.com/docs/auth/guides/plugins/phone-number
- https://www.better-auth.com/docs/plugins/phone-number
- https://www.better-auth.com/docs/plugins/2fa
- Installed Better Auth 1.7.14 phone-number and two-factor implementation/types.

## Implementation gates

1. Complete the restricted-role and identity/session bridge design; establish an
   executable PostgreSQL fixture for AAL1/AAL2, expiry, revocation and actor isolation.
2. Resolve auth dependency reproducibility and prove the email-OTP/TOTP session gate.
   Keep candidate implementation isolated until those tests pass.
3. Review the Neon baseline against all inventoried constraints, grants and functions.
   Preserve the original migrations; do not run them blindly against missing schemas.
4. Implement private object storage and evidence catalogue parity, then replace runtime
   transports while retaining routes, business logic, closed intake and payment gates.
5. Rehearse identity/data import with synthetic records, financial checksums and rollback.
   Source Supabase records and object state have not been inspected in this step;
   historical zero-record claims remain unverified and cannot justify dropping import.

The safe first rollback remains the unchanged reference application/backend. After
any future target writes, freeze and reconcile the delta before reverting; changing
the URL alone is not a financial-data rollback.

# SwiftTip MVP assessment and Neon migration plan

Assessment date: 27 October 2026. Source: `mvp-v3-greenfield-build` at
`c636b82eef9dc546b6e3b64abf0b77f2efc657bf`. This is the pre-implementation
assessment requested by the owner, not a claim of migration or release completion.

## Evidence and environment

The existing Next.js application was cloned and inspected, including financial and
identity migrations, server actions, API routes, access guards, six unit-test files,
SQL suites and operating/legal documentation. No AGENTS.md was present in the checkout.
The repository default branch is different from the reference branch; the reference
commit above is the baseline for all statements below.

Isolation prepared:

- GitHub branch: `migration/neon-mvp-completion`, created from the exact reference SHA.
- Neon project: `[project recorded in private workspace]`.
- Development branch: `[development branch name recorded privately]`, ID
  `[development branch ID recorded privately]`, parent `[parent branch ID recorded privately]` (production).
- Development branch was created without a compute. No migration or application-data
  SQL has been executed there. Branch creation copies the parent state; this does not
  establish that the parent contains the SwiftTip Supabase schema or data.
- Production/default branches, deployment settings and payment switches were not changed.

Fresh local `npm run ci` passed: architecture invariants, references to 76 RPCs,
schema-type marker through migration 0056, safety scan of 56 migrations, TypeScript,
35 unit tests across six files and the Next.js production build. These static checks
do not prove RPC runtime behavior, actual schema/type equivalence or production state.
Dependencies were installed with lifecycle scripts disabled, using a writable temporary
npm cache; the first install failed because the default cache was outside writable roots.

There are 23 SQL test files. They were inspected but not executed: the current suites
expect Supabase auth/storage roles and some expect controlled identity fixtures. There
is no browser E2E suite in the inspected reference tree. SMS delivery, MFA, storage,
actor isolation, hosted runtime, live provider integration and device usability have
not been independently verified in this assessment.

`docs/IMPLEMENTATION_STATUS.md` describes an August deployment, 32 tests and migrations
through 0053. The current source has 35 tests and migrations through 0056. Its deployed
counts, migration application claims and commercial readiness are historical claims,
not freshly verified facts. Legal documents remain labelled drafts in the repository;
their status in the source database has not been read.

## Current-state feature matrix

Status applies to the requested end capability. Implemented means present in source;
the proof column states separately what was actually executed. Partial does not imply
that the existing implementation should be replaced wholesale.

| Capability | Classification | Source/documentation evidence | Fresh verification and limits |
| --- | --- | --- | --- |
| Customer QR scan and manual code entry | Implemented | `src/app/scan/page.tsx`, `src/app/code/page.tsx`, endpoint resolution RPCs; camera fallback exists | Typecheck/build; no camera or device execution. Native BarcodeDetector availability varies. |
| Anonymous worker profile, quote and tip intent | Implemented | `src/app/tip/[token]/page.tsx`, `src/app/api/tips/{quote/,}route.ts`; server RPCs own eligibility, price and idempotency | Money/body parsing unit tests pass; positive database journey not run. Public intake is deliberately gated. |
| Anonymous receipt and payment return | Partially implemented | `src/app/receipt/[token]/page.tsx`, `src/app/payment/result/page.tsx`; opaque receipt access, no customer account requirement | Three payment-boundary tests pass, including fabricated-success rejection. Receipt authorization SQL not executed. |
| Independent worker self-registration | Missing | `src/app/worker/login/actions.ts` uses `shouldCreateUser:false`; `scripts/provision-worker.mjs` is controlled provisioning | Source confirms new numbers cannot self-register through current OTP request. |
| Worker phone ownership verification | Partially implemented | SMS OTP request/verify actions, abuse-admission RPC, session guards | Typecheck/build and static RPC checks only; SMS provider, delivery and replay behavior not exercised. |
| Worker identity/evidence review | Partially implemented | `src/app/worker/verification/*`, admin verification pages, migrations 0044–0048 and 0054 | Private storage, fingerprint and reviewer controls exist; SQL and real evidence lifecycle not run. Legal/provider acceptance remains external. |
| Permanent worker ID independent of venue | Missing | Worker UUID exists, but endpoint schema requires `worker_venue_association_id`; activation and public eligibility require venue | Unit tests currently enforce venue dependence. Issuance in migration 0039 and public lookup/quote/create in 0040–0041 require coordinated change. |
| Worker QR display/download | Partially implemented | `src/app/worker/qr/page.tsx`; generated QR and short code; endpoint issued at activation | Build only; QR can retain a demo context on failed live RPC. QR origin currently derives from request host headers. |
| Worker earnings and settlement history | Partially implemented | Worker dashboard/transactions, migration 0010 financial projections; no wallet/withdrawal flow | Pricing and separate payment/settlement state unit tests pass; dashboard totals and ownership SQL not run. Live summary failures can preserve demo totals. |
| Venue registration/onboarding | Partially implemented | Venue email OTP, invitation acceptance; admin venue creation/invitations | Controlled invitation flow exists; open venue self-registration is absent. No live OTP/membership journey run. |
| Venue association request/confirmation/end | Partially implemented | Worker onboarding actions, venue workers actions, migration 0011 | Venue admin can end association, disabling its endpoints. Worker-controlled unlink without QR changes is missing; SQL authorization not run. |
| Administrator operations | Partially implemented | Admin membership/RBAC, MFA, verification, pricing/legal review, audit/readiness, venue/pilot and exception screens | Build and RPC-reference checks pass; role isolation, real AAL2/recovery and operational mutations not exercised. |
| Payment provider abstraction | Partially implemented | `src/infrastructure/payments/provider.ts` defines interface and rejecting unconfigured adapter | No approved adapter or provider event normalization exists. Build passes; no provider contract tests. |
| Payment initiation and provider confirmation | Blocked by external dependency | Initiation route returns 503/501; webhook route returns 503/501 | Disabled/unconfigured initiation tests pass. Provider specification, sandbox and approval required for a real adapter. |
| Allocation, settlement and reconciliation | Partially implemented | Migrations 0003, 0007–0008: separate records, unique constraints, operative-success and transition helpers | State/money unit tests pass; concurrent provider success, settlement execution and reconciliation ingestion not tested against a database. |
| Signed, durable, idempotent provider ingestion | Missing | Webhook receipt/event schema and unique provider/event key exist; HTTP verification/processing does not | No signature, durable delivery replay or concurrent-event runtime proof. Provider-specific signature mechanics remain external. |
| Refunds/disputes | Partially implemented | Separate tables/events and admin inspection pages; `requestFullRefund` interface | Actual provider refund/chargeback execution blocked by provider contract; no end-to-end test run. |
| Worker/admin support | Partially implemented | Worker support actions and admin support cases; help page | Build only; case creation, privacy and retry/support escalation not exercised. |
| Authentication, sessions and authorization | Partially implemented | Supabase SSR middleware, server clients, `src/lib/access.ts`, migration 0046 session/abuse controls, 0043 privileges | Config tests pass; auth/session SQL suites not executed. These are migration-critical dependencies. |
| Private evidence storage | Partially implemented | Supabase private bucket, upload registration, availability/finalization controls | Storage is still Supabase-specific; upload/download/delete and partial failures untested here. |
| Financial integrity and audit | Implemented | Integer cents, versioned pricing, append/transition controls, restricted history, audit schemas, unique allocation/provider event constraints | 13 money tests and 3 state tests pass; database concurrency, permissions and imported-history parity remain unverified. |
| Privacy/legal/regulatory readiness | Blocked by external dependency | Draft legal pack, go-live/provider gates, data minimization controls | No publication/approval assumed. Legal identity, retention/processor arrangements, funds flow, KYC/payout responsibility and tax treatment require accountable approval. |
| Mobile loading/empty/error/retry states | Partially implemented | Existing visual system/navigation, `src/app/loading.tsx`, `error.tsx`, scan failure paths and page-level states | Build only; no narrow viewport, keyboard, accessibility, slow-network or real-device proof. |

## Critical MVP gaps, in priority order

1. Preserve financial/authorization controls before changing backend. Supabase is both
   identity authority and the database/storage authorization layer, not just a SQL URL.
   `auth.users` FKs, `auth.uid()/jwt()`, `auth.sessions`, AAL2, storage policies and
   service-role procedures must all receive explicit replacements.
2. Fix live worker/venue demo-data fallback and QR fallback. Failed live reads must
   show unavailable/retry states, never illustrative earnings, associations or identity.
3. Add self-service phone-verified worker signup with durable throttling, short OTP
   expiry, bounded attempts, single consumption and recoverable session creation.
   Phone verification alone must never grant financial activation.
4. Decouple permanent QR identity from venue membership and from payment readiness.
   Preserve existing tokens; allow optional audited association/unlink; snapshot
   venue context on each future tip and retain all historical references.
5. Implement durable provider-independent processing around the existing financial
   model: signature validation, replay identity, conflicting-event quarantine,
   reconciliation and concurrency proof. Keep live-provider wiring disabled.
6. Complete real auth, storage, negative authorization and anonymous journey tests;
   current unit tests are useful but cannot establish these boundaries.
7. Resolve provider, legal and payout contracts before live adapter/activation. Do
   not infer approval from available credentials, a feature flag or a successful build.

## File-level change plan

Paths labelled new are proposed owners, not a second application. Preserve the current
Next.js routes, components, visual assets and financial SQL domain.

| Files/area | Planned change and guarantee |
| --- | --- |
| `src/infrastructure/supabase/server.ts`, `admin.ts`; new `src/infrastructure/database/*` | Replace PostgREST query/RPC transport with parameterized PostgreSQL repositories. Inventory all 76 referenced RPCs and direct table reads. Use a restricted runtime role, transaction-local server-verified identity and existing permission boundaries; never query as owner on behalf of users. |
| New `src/infrastructure/auth/*`; worker/venue/admin login and MFA actions; `src/app/auth/*`; `middleware.ts`; `src/lib/access.ts`, `auth-security.ts` | Evaluate a PostgreSQL-backed maintained auth service/library supporting phone/email OTP, TOTP, server validation, revocation and bounded sessions. Proposed candidate: Better Auth with phone-number and two-factor capabilities, subject to current API/security validation. Route SMS/email through configured delivery services; no real messages during local tests. Preserve admin allowlisting, mandatory AAL2 and per-surface session age. Do not invent custom cryptography or silently weaken MFA. |
| New `src/infrastructure/storage/*`; worker verification actions, admin evidence reads | Replace Supabase storage with private S3-compatible storage. Preserve object keys/hashes, ownership checks, short signed access, file bounds, deletion/finalization audit, retention and access-denial behavior. Provider selection/configuration remains explicit. |
| `supabase/migrations/0001*`–`0056*` retained; new `db/migrations/*`, migration manifest/runner | Keep original history immutable. Build reviewed Neon baseline and explicit auth/storage mapping. Check extensions, definer owners/search paths, RLS/grants and function parity; do not blindly replay Supabase-specific DDL. Record checksums and target branch guard. |
| Identity/endpoint schema and SQL formerly owned by migrations 0002, 0011, 0017, 0039–0041 | Add independent permanent endpoint issuance after verified signup/profile creation; preserve existing links and immutable historical IDs. Separate discoverable identity from tip eligibility. Nullable venue context for new independent tips; maintain all money constraints. Unlink must not rotate, disable or reassign permanent identity. |
| `src/modules/workers/eligibility.ts` and tests; worker login/onboarding/profile/QR pages and actions | Remove venue as universal activation prerequisite; keep identity verification, global status, terms and payout readiness. Show permanent QR plus explicit activation status. Add owner-controlled unlink and optional venue selection. |
| `src/app/api/public/*`, `api/tips/*`, receipt and tip pages | Preserve anonymous journey, server-calculated price, opaque receipt access, durable idempotency and closed intake. Ensure old URLs still resolve appropriately and inactive profiles disclose minimal information. |
| `src/infrastructure/payments/provider.ts`; new provider event/service modules; `src/app/api/webhooks/payment-provider/route.ts`; initiation route | Extend current interface with normalized discriminated events and approved-adapter registry. Verify raw-body signatures using provider specification; preserve event payload hash and provider namespace. Atomically deduplicate receipt and financial effects; retry failed processing safely; reject changed payload under reused ID. Match amount/currency/account to stored intent, never browser totals. |
| Financial SQL helpers, `src/lib/states.ts`, admin settlement/refund/dispute pages | Preserve separate initiation/confirmation/allocation/settlement/refund/dispute lifecycles and append-only evidence. Surface mismatches for operations, no invented settlement success. Avoid wallets, subscriptions and custody changes. |
| Worker dashboard/QR, venue dashboard, transactions and support pages; `error.tsx` | Remove live demo fallback, distinguish empty/unavailable, provide safe retry and support paths, avoid claiming an error proves a preceding write failed. Use existing styles/navigation; audit 320/375/390px, keyboard, camera denial, slow/repeated requests. |
| `src/lib/config.ts`, `.env.example`, health route, runtime check, provisioning/recovery scripts | Replace Supabase config and tools; separate database/auth/storage/provider readiness. Keep secrets server-only and out of health/errors/logs. Pin canonical QR origin. Demo mode must be explicit and clearly labelled. |
| `src/types/database.ts`, scripts/check-*.mjs, `package.json`, lockfile, `.github/workflows/ci.yml` | Generate real Neon schema contracts, adapt architecture checks to new owners, keep migration guardrails and reproducible installs. Add isolated PostgreSQL integration/authorization suites and provider fixture tests; do not replace SQL tests with source-string checks. |
| `docs/ARCHITECTURE.md`, runtime docs, implementation/evidence matrices and new migration/readiness runbook | Record verified replacement contracts, rehearsals, rollback thresholds and remaining external gates. Retain original evidence as historical, do not present it as a fresh pass. |

## Migration and rollback strategy

1. **Inventory and pin:** retain the source SHA, 56 SQL files/checksums and existing
   schema/type contracts. Inspect actual source and target schema metadata using
   authorized non-production access. Determine whether any records require transfer;
   do not trust old zero-count claims or copy production personal data into development.
2. **Rehearse independently:** use the development branch ID explicitly for every SQL
   operation. Provision development compute only there. Use synthetic fixtures and
   private test storage. Test Neon extension/role capabilities rather than assuming
   Supabase service-role or storage schemas exist.
3. **Preserve trust boundaries:** maintain identity UUID mapping for every historical
   user reference. Revoke old sessions and require reauthentication at cutover rather
   than translating unverified sessions. Maintain MFA enrolment/re-enrolment policy
   before enabling admin access. Never trust browser-supplied JWT claims in SQL settings.
4. **Expand before contract:** create reviewed replacement auth/storage dependencies,
   then baseline/import in FK order. Preserve PK/FK/unique/check constraints, restrictive
   deletion rules, audit timestamps, tip pricing snapshots and historical settlement,
   refund/dispute evidence. Private storage transfer must reconcile hashes, byte counts,
   metadata and access denial. Keep original history and all source records intact.
5. **Prove parity:** compare table counts, ordered keyed checksums and orphan checks;
   reconcile integer-cent totals by currency/state/allocation; compare grants, RLS,
   definer functions and transition protections. Execute all adapted SQL tests plus
   concurrent financial and identity tests. Verify anonymous callers cannot query
   private state and each worker/venue/admin role has only its intended access.
6. **Candidate delivery:** open/update a draft PR against the reference branch; run CI
   and review migration artifacts. A preview deployment or production cutover still
   requires the owner's explicit approval. Payments and public intake stay closed.
7. **Future approved cutover:** create a verified backup/snapshot and freeze relevant
   writes; complete final delta import/parity checks and switch configuration as a
   single versioned candidate. No unplanned dual writes. Retain source and old objects
   throughout the rollback window; never delete them as part of first cutover.
8. **Rollback:** before accepting target writes, revert the application/configuration
   candidate to the pinned source version and original backend. Once target writes
   exist, first freeze writes and reconcile/export the delta; blindly pointing back
   would lose history or duplicate financial effects. Prefer forward repair for
   recorded provider events; preserve original IDs/deduplication and never replay
   money blindly. Trigger rollback/freeze on missing financial parity, authorization
   leakage, broken OTP/MFA, evidence loss or failed core journeys. Do not restore,
   rename, promote or delete any production branch without explicit approval.

## Prioritized implementation and acceptance sequence

1. Correct fail-closed live read behavior and add targeted failure-path tests. Capture
   baseline UI/nav and test controls before backend changes.
2. Complete schema/RPC/identity/storage mapping; validate auth and delivery candidate
   capabilities. Build Neon baseline and roles on the isolated branch. Gate: fresh
   schema install plus adapted negative permission/session tests pass.
3. Replace database/auth/session/storage transports and provisioning/recovery tooling
   with functional parity. Gate: worker, venue and AAL2 admin can authenticate under
   test delivery, evidence access is private and old sessions cannot bypass guards.
4. Implement independent signup, permanent QR, optional association and owner unlink.
   Gate: verified new worker gets the same QR before/after association changes;
   unverified/blocked/unready workers cannot accept real tips; historical tips retain
   their original venue context and financial facts.
5. Implement normalized payment event processing and sandbox/test provider contract.
   Gate: invalid signatures, stale/replayed/conflicting/concurrent events, amount and
   currency mismatches, failed retry and out-of-order events cannot duplicate or
   improperly advance money. Payment confirmation never implies settlement.
6. Complete interface failure/empty/loading/retry/support states using existing visual
   patterns. Gate: narrow/mobile and keyboard journeys pass; failed writes show an
   honest recovery state and same-key retries do not duplicate intent.
7. Run full CI, fresh-install/upgrade/rollback rehearsal, security/actor isolation,
   storage, anonymous/customer and mobile tests. Deliver implementation PR and a
   deployment-readiness report listing passes, failures and external blockers.

## Readiness at this assessment

**Not deployment-ready.** Local source CI passed; no backend migration, database
integration, provider integration, security acceptance or device acceptance is claimed.
Implementation phases remain outstanding. External dependencies include delivery
credentials/configuration, private storage arrangements, approved payment sandbox and
signed-event specification, payout/KYC responsibilities and legal/regulatory approval.
Repository credentials and database credentials have not been printed or requested.
Live payments, public intake, production changes and deployment remain outside this work.

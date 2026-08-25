# SwiftTip MVP v3 — Implementation Status

Current environment: **PRE-LIVE / STAGING**

Canonical Supabase project: `bxtfcfuehqljedxwykfk`

Greenfield branch: `mvp-v3-greenfield-build`

Status evidence refreshed: **24 August 2026**. The current workspace is not a Git checkout, so a new Git commit SHA cannot be claimed until the completed source is synchronised to `mvp-v3-greenfield-build`.

## Executive position

The MVP v3 control architecture, canonical database, core Customer/Worker/Venue/Admin surfaces and pre-pilot operating controls are substantially built. SwiftTip remains deliberately closed to public Tip intake and real money.

The deployed closed-state build is technically ready for controlled identity testing. Execution is deferred until approved test people are available; this does not block continued work on independent commercial, legal and operating controls.

## Closed commercial baseline

The latest verified canonical baseline remains:

- Auth users: `0`.
- Workers: `0`.
- Venues: `0`.
- Active Worker tipping endpoints: `0`.
- Active/effective Pricing Versions: `0`.
- Effective published legal documents: `0`.
- Active Pilot cohorts: `0`.
- Public Tip intake switch: `OFF`.
- Public Tip intake readiness: `false`.
- Payment provider: `unconfigured`.
- `PAYMENTS_ENABLED=false`.

No application action is authorised to publish legal drafts, activate pricing, start a Pilot, enable public Tip intake or move real money.

## Application foundation

Implemented application surfaces include:

- Customer home, QR scan, manual code entry, Worker profile, Tip quote, Tip creation contract, anonymous receipt/status and provider-return boundary.
- Worker SMS OTP, onboarding, verification evidence, Venue association, profile, QR, Tip history, support and Settlement-state views.
- Venue email OTP, controlled invitation/onboarding, Worker association confirmation and aggregate Venue operating views.
- Admin email OTP, membership enforcement, TOTP/AAL2, Venues, verification, legal review, pricing governance, draft Pilot setup, transactions, Settlement exceptions, Refunds, Disputes, support, audit and readiness.

Customer payment return remains non-authoritative. Payment success and Worker Settlement are separate records and states.

## Canonical database

Canonical migrations are applied through:

`mvp_v3_0052_pricing_review_actor_indexes`

The repository contains numbered migrations `0001` through `0052`.

Migration `0051` adds a controlled pricing workflow (draft → under review → approved), role-restricted mutations, audit evidence, blocker enforcement and database guards that prohibit scheduling/activation without prior approval. Migration `0052` adds covering indexes for pricing review actors. Neither migration exposes pricing scheduling or activation.

The data/control model includes identity, Worker/Venue relationships, verification, private evidence storage, provider Settlement profiles, tipping endpoints, Pricing Versions, Terms/Privacy versions and acceptance evidence, Pilot cohorts, Tips, Payment Attempts, operative-success designation, Financial Allocations, Settlements, provider fees, Refunds, Disputes, reconciliation, support, Admin RBAC, audit, notifications and private runtime Tip-intake controls.

## Financial and custody boundary

SwiftTip v3 remains non-custodial by design:

- no Worker wallet;
- no available balance;
- no withdrawal/cash-out flow;
- no payout-request/payout-batch architecture;
- gratuity principal is not modelled as SwiftTip-owned funds;
- duplicate provider successes cannot create duplicate economic allocations;
- completed financial history is append/transition controlled rather than casually editable;
- provider direct costs are separated from SwiftTip transaction revenue.

Provider-specific Refund, chargeback, Settlement and fee mechanics remain intentionally unimplemented until a provider is selected and approved.

## Legal state

Four v0.1 legal documents are synchronised between repository and canonical database:

- Worker Terms;
- Venue Terms;
- Customer Transaction Terms; and
- Privacy Notice.

All remain **DRAFT / NOT PUBLISHED / NOT IN FORCE**. Approval and publication remain separate concepts and there is no legal-publish control in the application.

Current exact repository source sizes remain:

- Customer Transaction Terms: 10,859 bytes.
- Privacy Notice: 14,023 bytes.
- Venue Terms: 12,132 bytes.
- Worker Terms: 12,894 bytes.

## Worker activation and public endpoint controls

Worker activation is gate-driven and depends on the required identity verification, verified active Venue association, Settlement readiness and current published Worker Terms acceptance.

When legitimate activation eventually succeeds, endpoint controls provide:

- one active endpoint per Worker;
- 48 lowercase hexadecimal public-token characters (192 bits);
- an 8-character Crockford-style short code;
- stale-endpoint disablement when the verified Venue relationship changes; and
- no endpoint token/code in audit events.

Public endpoint resolution, profile lookup, quote and new Tip creation additionally depend on database runtime readiness and current Terms rules.

## Public Tip-intake controls

The private runtime switch defaults to `OFF`. New public Tip intake requires all of:

1. the private runtime switch enabled;
2. an active/effective Pricing Version; and
3. current published/effective Customer Transaction Terms.

The Admin readiness surface is read-only and cannot enable the switch.

Database-side last-resort Tip-intent ceilings are:

- 120 new Tip intents per Worker endpoint per minute; and
- 600 per 15 minutes.

Idempotent replay is evaluated before the kill-switch/velocity decision so an already-created Tip may be recovered safely without opening new intake.

## Authentication and controlled provisioning

### Admin

Admin login uses email OTP with `shouldCreateUser:false`. Active Admin membership is required. MFA-required Admins must reach AAL2 through TOTP before privileged Admin RPCs succeed. Service-role-only Admin bootstrap and MFA-recovery audit controls exist.

### Worker

Worker login uses SMS OTP with `shouldCreateUser:false`. Worker Auth bootstrap is service-role only and does not create a Worker business record, approve verification, attach a Venue, create an endpoint or activate the Worker.

### Venue

Venue email OTP may create the basic Auth identity, but authentication alone grants no Venue authority. Operations/Super Admin must invite the exact Auth user to an active Venue. Venue permissions do not expose Worker KYC, bank/Settlement destination data or Settlement control.

## Database verification suites

The repository now uses a single ordered smoke-suite sequence:

1. `001_schema_smoke.sql`
2. `002_operational_controls_smoke.sql`
3. `003_venue_pilot_receipt_controls.sql`
4. `004_notification_controls.sql`
5. `005_legal_draft_controls.sql`
6. `006_admin_bootstrap_controls.sql`
7. `007_identity_bootstrap_controls.sql`
8. `008_tipping_endpoint_and_terms_controls.sql`
9. `009_current_published_terms_eligibility.sql`
10. `010_public_tip_intake_controls.sql`
11. `011_client_privilege_hardening.sql`
12. `012_verification_evidence_storage_hardening.sql`
13. `013_verification_review_availability.sql`
14. `014_actor_isolation_simulation.sql`
15. `015_auth_session_abuse_controls.sql`
16. `016_admin_mfa_recovery_controls.sql`
17. `017_session_age_behaviour.sql`
18. `018_pre_pilot_control_plane.sql`
19. `019_pricing_review_workflow.sql`

`018_pre_pilot_control_plane.sql` is a filename/sequence correction of the already-executed non-mutating pre-pilot control-plane gate formerly named `013_pre_pilot_control_plane.sql`; the control itself is unchanged apart from its PASS label.

## Repository and build reproducibility

The repository now contains `package-lock.json` and CI installs dependencies with `npm ci`.

`npm run ci` runs:

- architecture invariants;
- application-RPC/migration contract check;
- generated Supabase type freshness;
- migration safety;
- TypeScript typecheck;
- unit tests; and
- Next.js production build.

The complete local pipeline passes through migration `0052`: architecture invariants, 74 application RPC contracts, schema freshness, migration safety, TypeScript, 30 unit tests and the Next.js production build. Production deployment `dpl_GJm4kGnHQUoFaZuAH75jkAsmmynd` is READY and includes the controlled pricing administration routes.

## Runtime environment gate

The staging health contract requires:

- `environment=staging`;
- `hasSupabaseUrl=true`;
- `hasSupabasePublishableKey=true`;
- `supabaseConfigSource=environment`;
- `databaseConfigured=true`;
- `paymentProviderConfigured=false` until provider approval;
- `paymentsEnabled=false`; and
- `liveMoneyReady=false`.

The production alias health response was verified on 24 August 2026 with `supabaseConfigSource=environment`, database configuration present, provider configuration absent, payments disabled and live-money readiness false.

## Branch protection gate

The greenfield branch is currently unprotected. Do not enable required status checks until the exact GitHub CI check name has been observed on a successful current-head run. See `docs/BRANCH_PROTECTION_GATE.md`.

## Remaining controlled pre-pilot sequence

1. Synchronise the completed workspace to the controlled GitHub branch and capture the exact commit SHA.
2. Run the repository CI on that exact commit and make the observed check name eligible for branch protection.
3. When approved test people are available, provision controlled Admin/Worker/Venue test identities.
4. Execute `docs/CONTROLLED_IDENTITY_TEST_PACK.md` and record evidence in `docs/PRE_PILOT_EVIDENCE_MATRIX.md`.
5. Resolve commercial pricing blockers through the controlled review workflow; approval must remain separate from activation.

## External gates that remain closed

Legal/commercial/provider work still requires final legal identity/contact inputs, privacy administration details, pricing/VAT/tax treatment, provider category/funds-flow approval, split mechanics, Worker KYC/subaccount model, Settlement destination/schedule, Customer service-fee treatment, complete provider pricing, webhook verification/replay, Refund/chargeback rules, failed Settlement handling, reconciliation data and production credentials.

Fine-grained edge/server anti-abuse remains a pre-live requirement for public read-only enumeration and distributed traffic beyond the existing database Tip-intent ceilings.

## Production separation

The `swifttip.vercel.app` alias now serves the manually deployed MVP v3 closed-state build. Its runtime environment remains `staging`, public Tip intake is disabled, no provider is configured and live money is not ready. A Vercel production target is deployment topology, not commercial authorisation.

GitHub source synchronisation to `mvp-v3-greenfield-build` remains outstanding because this workspace is not a Git checkout. Do not claim branch/commit parity until that sync is completed and verified.

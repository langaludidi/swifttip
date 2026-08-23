# SwiftTip MVP v3 — Pre-Pilot End-to-End Readiness

Status: **PRE-LIVE / CONTROLLED TEST PLAN**

This document governs the transition from a technically prepared staging system to controlled identity and pilot-readiness testing. It does **not** authorise legal publication, pricing activation, public Tip intake, Pilot activation, provider integration or real-money operation.

`PAYMENTS_ENABLED` must remain `false` throughout this phase.

## 1. Current clean baseline

Canonical Supabase project: `bxtfcfuehqljedxwykfk`.

Latest verified closed baseline:

- Auth users: 0.
- Workers: 0.
- Venues: 0.
- Active Worker tipping endpoints: 0.
- Active/effective Pricing Versions: 0.
- Effective published legal documents: 0.
- Active Pilot cohorts: 0.
- Public Tip intake switch: OFF.
- Public Tip intake readiness: false.
- Payment provider: unconfigured.
- Real payments: disabled.

Database smoke suite `018_pre_pilot_control_plane.sql` is the ordered pre-pilot control-plane gate. It is the same non-mutating control previously stored under the duplicate `013_pre_pilot_control_plane.sql` filename; only the suite number/PASS label changed.

## 2. Stage A — release-grade staging gate

No real/test Auth identity may be provisioned until all Stage A items are satisfied.

### A1. Current branch build

Required evidence:

- exact `mvp-v3-greenfield-build` head SHA recorded;
- `npm ci` dependency install succeeds;
- architecture check passes;
- database RPC contract check passes;
- migration safety check passes;
- generated Supabase types match the latest migration number;
- TypeScript check passes;
- unit tests pass;
- Next.js production build passes.

Current state: the latest greenfield source fix is at `31d7a7b87aec5eff22e4754dddeb3fda1e7698ca`. Vercel rate-limited the deployment before it could build that head, so current-head build evidence is still outstanding.

### A2. Runtime environment

A successful greenfield Preview `/api/health` must show:

- `environment = staging`;
- `hasSupabaseUrl = true`;
- `hasSupabasePublishableKey = true`;
- `databaseConfigured = true`;
- `supabaseConfigSource = environment`;
- `paymentProviderConfigured = false` until provider approval;
- `paymentsEnabled = false`;
- `liveMoneyReady = false`.

Current state: runtime configuration on the current head is **unverified**. Earlier Preview evidence showed `staging_fallback`, but Vercel variables were subsequently reviewed/changed. Only a fresh current-head health response is accepted as evidence.

### A3. Database closed-state gate

Run `supabase/tests/018_pre_pilot_control_plane.sql` whenever the canonical database has changed since its last PASS.

Pass requires:

- required Admin/Venue/Worker/Customer-path RPCs exist;
- service-only bootstrap/recovery controls are not client executable;
- private runtime controls are not client accessible;
- public Tip intake remains OFF and not ready;
- no active pricing exists;
- no effective published legal document exists;
- no active Pilot exists;
- no active Worker endpoint exists; and
- no generic legal/pricing/Pilot/Tip-intake activation RPC exists.

## 3. Test identity constitution

When Stage A passes, controlled identities may be approved for execution:

- one Super Admin test identity;
- one Venue Admin test identity;
- one Worker test identity;
- optionally one View Only Venue identity.

Every identity must have an approved custodian, purpose, intended role, provisioning timestamp, evidence reference and cleanup action. Do not commit personal email addresses, phone numbers, OTPs, TOTP secrets, service-role keys or identity documents.

Use `docs/PRE_PILOT_TEST_DATA_CONVENTION.md` and `docs/CONTROLLED_IDENTITY_TEST_PACK.md`.

## 4. Stage B — Admin identity and AAL2

Sequence:

1. Provision only the approved Admin Auth identity through the controlled service-role bootstrap command.
2. Confirm Admin email OTP delivery.
3. Confirm invalid/expired OTP fails.
4. Confirm an authenticated identity without active Admin membership has no Admin authority.
5. Sign in as the provisioned Admin.
6. Confirm privileged RPCs fail at AAL1 where AAL2 is required.
7. Enrol TOTP MFA.
8. Complete the TOTP challenge.
9. Confirm intended privileged operations succeed only at AAL2 and within role.
10. Sign out and confirm session invalidation/re-authentication behaviour.

Never store OTP values, TOTP secrets or recovery material in the evidence pack.

## 5. Stage C — Venue lifecycle

1. Admin creates a `[PREPILOT]` test Venue.
2. Venue remains pending until explicitly approved.
3. Admin approves the Venue.
4. Venue user signs in by email OTP.
5. Authentication alone must grant no Venue authority.
6. Admin invites the exact Auth user to the exact Venue.
7. Confirm the invitation is scoped to that user and Venue.
8. Confirm unpublished Venue Terms cannot be treated as accepted/effective.
9. Do not manufacture publication merely to complete the test.
10. Test View Only versus Venue Admin separation if the optional identity is approved.

## 6. Stage D — Worker lifecycle

1. Bootstrap one approved Worker Auth phone identity.
2. Confirm actual SMS OTP delivery.
3. Worker signs in and starts onboarding.
4. Confirm intended public identity is separated from private/legal identity.
5. Start identity verification.
6. Upload only approved non-production evidence through the private evidence workflow.
7. Submit verification.
8. Admin reviews and records a permitted decision.
9. Worker requests association with the controlled Venue.
10. Venue Admin confirms/rejects the relationship.
11. Confirm Venue cannot read private verification evidence, bank data or Settlement destination data.
12. Confirm Worker Terms acceptance remains blocked while current Worker Terms are unpublished/ineffective.
13. Confirm Worker activation remains blocked while any required gate is missing.

Provider Settlement/KYC readiness is unresolved. The full activation gate must not be forced through.

## 7. Stage E — negative activation proof

Independently prove that each missing condition blocks activation:

- identity verification incomplete;
- Venue association not verified;
- Venue inactive;
- Settlement readiness missing;
- current Worker Terms unpublished/not accepted.

`BLOCKED` is the correct result when the system refuses to cross an unresolved legal/provider gate.

## 8. Stage F — Customer path, only after legitimate endpoint issuance

Do not execute this stage until a Worker can legitimately activate without bypassing any gate.

When authorised:

1. Scan the QR on at least two ordinary devices.
2. Resolve the 8-character short code manually.
3. Confirm only permitted public Worker/Venue data is exposed.
4. Quote R10, R20, R50 and R100 and compare with server response.
5. Test malformed JSON, unsupported media and oversized body handling.
6. Create a Tip with a stable idempotency key.
7. Replay the same request and verify recovery of the same economic resource.
8. Attempt payment initiation and confirm `PAYMENTS_ENABLED=false` stops the money path.
9. Confirm browser-return parameters cannot create Payment success.
10. Confirm anonymous receipt access requires its opaque token.

No fake Payment success or Settlement success may be inserted to complete the test.

## 9. Provider sandbox stage

Not currently authorised. It begins only after provider selection, category/funds-flow approval and approved sandbox mechanics exist.

Future trace:

`Tip → Payment Attempt → verified provider event → operative Payment success → Financial Allocations → expected Settlement → provider Settlement evidence → provider fee → reconciliation`.

Duplicate-success, failed-Settlement, Refund and Dispute cases are mandatory before real money.

## 10. Evidence and cleanup

Record every test using `PRE_PILOT_EVIDENCE_MATRIX.md` with exact Git SHA, migration version, actor, starting state, expected/actual result, PASS/FAIL/BLOCKED, canonical record IDs, audit references and cleanup status.

Cleanup must preserve auditability. End/revoke authority in the supported lifecycle, disable endpoints before closing relationships, remove evidence only through the controlled evidence-removal workflow, and never silently promote test data into P1.

## 11. Stop conditions

Stop immediately if:

- a client role can access private runtime controls;
- an unauthorised role can execute an actor action;
- AAL2 can be bypassed;
- public projection leaks private Worker information;
- a Worker activation gate can be bypassed;
- Tip intake turns on unexpectedly;
- draft pricing/unpublished Terms are treated as effective;
- idempotent replay can duplicate the economic Tip;
- browser state is accepted as payment truth without provider evidence; or
- execution would require inventing provider, KYC or legal facts.

## 12. Exit states

Record exactly one:

- `READY FOR CONTROLLED IDENTITIES` — Stage A complete.
- `CONTROLLED IDENTITY TESTING` — actor flows are under test; no customer/payment activation.
- `BLOCKED — LEGAL/PROVIDER` — internal flows proved only as far as legitimate external gates permit.
- `READY FOR PROVIDER SANDBOX` — internal activation/customer path is proved and provider sandbox is approved.
- `NOT READY` — security, integrity, access or deployment defect remains.

Current state remains **PRE-LIVE / CLOSED**.

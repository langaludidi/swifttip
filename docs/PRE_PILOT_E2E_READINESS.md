# SwiftTip MVP v3 — Pre-Pilot End-to-End Readiness

Status: **PRE-LIVE / CONTROLLED TEST PLAN**

This document governs the transition from a technically prepared staging system to controlled pilot-readiness testing. It does **not** authorise legal publication, pricing activation, public Tip intake, Pilot activation, provider integration or real-money operation.

`PAYMENTS_ENABLED` must remain `false` throughout this phase.

## 1. Current clean baseline

Canonical Supabase project: `bxtfcfuehqljedxwykfk`.

Baseline verified on 23 August 2026:

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

Database smoke suite `013_pre_pilot_control_plane.sql` confirms the required control-plane functions exist while the commercial activation surfaces remain closed.

## 2. Purpose of this phase

The purpose is to prove that SwiftTip can move a controlled test actor through the intended lifecycle without bypassing role, MFA, Terms, verification, Venue-association, Settlement or payment gates.

The phase is complete only when the system proves both:

1. **positive paths** work when the required gate has genuinely been satisfied; and
2. **negative paths** fail closed when the gate has not been satisfied.

No successful test may be obtained by editing canonical financial records, weakening RLS, bypassing MFA, inserting false published Terms, activating draft pricing or enabling the Tip-intake switch prematurely.

## 3. Test identity constitution

Controlled identities must be clearly non-production and traceable to the test record.

Required identities when execution is approved:

- one SwiftTip Super Admin test identity;
- one Venue Admin test identity;
- one Worker test identity;
- optionally one View Only Venue identity for role-separation testing.

Do not use fabricated real-person identity documents or fake banking details to satisfy a provider/KYC gate. Provider/KYC and Settlement-readiness testing waits for an approved provider sandbox or approved test mechanism.

Every test identity must have:

- approved owner/custodian;
- creation timestamp;
- purpose;
- expected role;
- expected cleanup action; and
- evidence reference.

## 4. Stage A — platform and configuration readiness

### A1. Repository/CI

Required evidence:

- branch head identified;
- architecture check passes;
- database RPC contract check passes;
- migration safety check passes;
- generated Supabase types match the latest migration number;
- TypeScript check passes;
- unit tests pass;
- Next.js production build passes.

Current known blocker: Vercel has recently rate-limited new Preview builds. A stale successful build is not evidence that the current branch head compiles.

### A2. Runtime environment

Required `/api/health` conditions for staging:

- `environment = staging`;
- `databaseConfigured = true`;
- `supabaseConfigSource = environment`;
- `paymentsEnabled = false`;
- `paymentProviderConfigured = false` until provider approval;
- `liveMoneyReady = false`.

Current blocker: Preview is connected through `staging_fallback`, not explicit Vercel Preview environment variables. This must be corrected before controlled identity testing is treated as release-grade evidence.

### A3. Database closed-state gate

Run `supabase/tests/013_pre_pilot_control_plane.sql`.

Pass requires:

- all required Admin/Venue/Worker/customer-path RPCs exist;
- service-side bootstrap controls are not executable by client roles;
- private runtime controls are inaccessible to client roles;
- Tip intake remains OFF and not ready;
- no active pricing;
- no effective published legal documents;
- no active Pilot;
- no active Worker endpoint; and
- no generic legal/pricing/Pilot/Tip-intake activation RPC exists.

## 5. Stage B — Admin identity and AAL2

Execute only after Stage A passes.

Sequence:

1. Provision one approved test Auth identity through the controlled Admin bootstrap command.
2. Confirm Admin email OTP delivery.
3. Confirm an invalid or expired OTP does not authenticate.
4. Confirm an authenticated user without active Admin membership cannot access Admin surfaces.
5. Sign in as the provisioned Admin.
6. Enrol TOTP MFA.
7. Confirm privileged Admin RPCs fail before AAL2.
8. Complete TOTP challenge.
9. Confirm AAL2 access to the intended Admin role only.
10. Sign out and verify session invalidation/re-authentication behaviour.

Evidence:

- Auth user ID;
- Admin membership ID;
- role;
- OTP test result;
- TOTP factor ID or masked evidence reference only;
- AAL2 result;
- audit-event references;
- screenshots of allowed/denied states with secrets removed.

Never store OTP values, TOTP secrets or recovery material in the evidence pack.

## 6. Stage C — Venue lifecycle

Sequence:

1. Admin creates a controlled test Venue.
2. Venue remains pending until explicitly approved.
3. Admin approves the Venue.
4. Venue user authenticates by email OTP.
5. Authentication alone must grant no Venue authority.
6. Admin invites the exact Auth user to the exact Venue.
7. Confirm invitation appears only to that user.
8. Venue user reviews the current Venue Terms.
9. If Venue Terms are not yet legally published, acceptance must remain blocked. This is the expected current-state result.
10. Once legally approved/published in a later phase, record acceptance and membership activation.
11. Confirm View Only and Venue Admin permissions differ where applicable.

Evidence:

- Venue ID;
- Venue status changes;
- Auth user ID;
- membership ID;
- invitation status;
- Terms version ID when eventually available;
- relevant audit events.

## 7. Stage D — Worker lifecycle

Sequence:

1. Bootstrap one approved Worker Auth phone identity.
2. Confirm real SMS OTP delivery.
3. Worker signs in and starts onboarding.
4. Worker creates private/legal identity and intended public display identity.
5. Worker starts SwiftTip identity verification.
6. Upload only approved non-production verification evidence.
7. Submit verification.
8. Admin reviews and records the decision.
9. Worker requests association with the controlled Venue.
10. Venue Admin confirms or rejects the real relationship.
11. Confirm Venue cannot see Worker private verification evidence or Settlement destination data.
12. Confirm Worker Terms acceptance remains blocked until the current Worker Terms are published/effective.
13. Confirm Worker activation remains blocked while any required gate is missing.

Current expected blocker: provider Settlement/KYC readiness is unresolved, so the full Worker activation gate must not be forced through.

Evidence:

- Worker ID;
- verification ID;
- document metadata reference, never raw sensitive evidence in the general test log;
- Worker–Venue association ID;
- association status;
- onboarding-state blocker list;
- audit references.

## 8. Stage E — activation-gate proof

This stage must prove the gate rather than bypass it.

For each missing condition, capture the blocked result:

- identity verification incomplete;
- Venue association not verified;
- Venue inactive;
- Settlement readiness missing;
- Worker Terms not published/accepted.

Only after every external/legal/provider gate is legitimately resolved may a controlled test Worker activate and receive a real SwiftTip endpoint.

On successful controlled activation, verify:

- exactly one active endpoint exists for the Worker;
- public token has the required high-entropy format;
- short code has the required format;
- changing/ending the verified Venue association disables the stale association-bound endpoint;
- public projection exposes no legal surname, phone, KYC evidence, bank data or internal reason fields.

## 9. Stage F — customer path, payments still disabled

Once a legitimately activated controlled Worker endpoint exists:

1. Scan QR from at least two ordinary mobile devices.
2. Resolve the short code manually.
3. Verify recipient identity and Venue display.
4. Quote R10, R20, R50 and R100.
5. Confirm displayed amounts equal the server-authoritative response.
6. Confirm malformed JSON, unsupported content type and oversized body protections behave as designed.
7. Create a canonical Tip using a stable idempotency key.
8. Replay the same request and confirm the same economic resource is recovered rather than duplicated.
9. Attempt payment initiation.
10. Confirm the application stops at the deliberate `PAYMENTS_ENABLED=false` boundary.
11. Confirm browser return parameters cannot mark the Tip paid.
12. Confirm Customer receipt access uses the opaque receipt token, not a guessable Tip reference.

No fake payment-success state may be inserted for the purpose of making this phase appear complete.

## 10. Stage G — provider-sandbox transaction trace

This stage is **not currently authorised** and begins only after provider selection, contractual/category approval and sandbox mechanics are known.

Required future trace:

`Tip → Payment Attempt → verified provider event → operative Payment success → Financial Allocations → expected Worker Settlement → provider Settlement evidence → provider fee → reconciliation`.

Duplicate-success, failed-Settlement, Refund and Dispute test cases must be included before real money.

## 11. Evidence pack

Every executed test receives one evidence record with:

- test ID;
- date/time;
- environment;
- Git commit;
- database migration version;
- actor role;
- starting state;
- action performed;
- expected result;
- actual result;
- PASS / FAIL / BLOCKED;
- canonical record IDs;
- audit-event references;
- screenshot/log references where useful;
- cleanup status;
- tester/approver.

`BLOCKED` is a valid result when a genuine unresolved legal/provider gate prevents the positive path. It must not be relabelled `PASS`.

## 12. Cleanup constitution

Test cleanup must preserve auditability.

Do not delete or rewrite completed financial history.

For pre-money test identities:

- revoke Admin memberships rather than silently overwriting role history;
- revoke/end Venue memberships;
- suspend/close the test Venue if it is not intended for the actual Pilot;
- end Worker–Venue associations;
- deactivate/suspend test Worker records where supported;
- disable endpoints;
- delete temporary Auth identities only after dependent application records and audit requirements are understood;
- delete private verification storage objects only through the controlled evidence-removal workflow;
- retain the evidence register showing what was created and how it was closed.

Any test data intended to become genuine P1 data must be explicitly reclassified and approved; it must not silently drift from “test” to “live”.

## 13. Stop conditions

Stop the readiness exercise immediately if:

- a client role gains access to private runtime controls;
- an unauthorised role can execute an Admin/Worker/Venue action;
- AAL2 can be bypassed;
- customer public projection leaks private Worker data;
- a missing gate can be bypassed to activate a Worker;
- Tip intake becomes enabled unexpectedly;
- draft pricing or unpublished Terms are treated as effective;
- one request creates duplicate economic Tip resources;
- payment/browser state is treated as authoritative without provider evidence; or
- any action would require inventing provider/KYC/legal facts.

## 14. Pre-Pilot exit decision

Record exactly one outcome:

- `READY FOR CONTROLLED IDENTITIES` — Stage A complete; approved test contacts may be provisioned.
- `CONTROLLED IDENTITY TESTING` — identity and role flows are under test; no customer/payment activation.
- `BLOCKED — LEGAL/PROVIDER` — internal flows proven as far as possible; external gates prevent activation.
- `READY FOR PROVIDER SANDBOX` — internal activation/customer path proven and approved provider sandbox is available.
- `NOT READY` — security, access, integrity or deployment defect requires remediation.

At the current baseline, SwiftTip remains **PRE-LIVE / CLOSED** and no real-money authorisation is implied.

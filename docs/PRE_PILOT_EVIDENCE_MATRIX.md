# SwiftTip MVP v3 — Pre-Pilot Evidence Matrix

Status: **CONTROLLED TEST TEMPLATE**

Use with `PRE_PILOT_E2E_READINESS.md`, `CONTROLLED_IDENTITY_TEST_PACK.md` and `PRE_PILOT_TEST_DATA_CONVENTION.md`. Missing external approval is recorded as `BLOCKED`, never converted into a synthetic pass.

| ID | Control | Expected evidence | Current state |
|---|---|---|---|
| PP-001 | Branch head identified | exact Git SHA | PASS — `mvp-v3-greenfield-build` synchronised at `1f813609c401a31239200ea219e0b151e135da4c` |
| PP-002 | Current-head CI/build | `npm ci` + architecture + DB contract + schema freshness + migration safety + typecheck + tests + Next build | PASS — GitHub Actions run `32905799364`; exact-head `CI / test` succeeded through migration `0055`; 76 RPC contracts |
| PP-003 | Generated DB types current | `src/types/database.ts` provenance migration equals repo migration `0055` | PASS |
| PP-004 | Staging Supabase config explicit | deployed `/api/health` says `supabaseConfigSource=environment` | PASS — HTTP 200 verified on deployment `dpl_J2LaZeqTvPwYcUgYgdGrNXXmtWzV` at exact head |
| PP-005 | Payments disabled | `/api/health`: `paymentsEnabled=false`, `liveMoneyReady=false` | PASS — exact-head Preview reports provider unconfigured and both payment gates false |
| PP-006 | Closed database control plane | `018_pre_pilot_control_plane.sql` | PASS — rerun against canonical database after migration `0055` on 26 August 2026 |
| PP-007 | Branch protection ready | required-check name observed on a successful CI run | READY — exact required-check context observed as `CI / test`; branch configuration remains an owner action |
| PP-010 | Admin Auth identity controlled | approved test email + Auth user ID | PASS — ID-ADM-01 is an existing controlled email Auth identity with one active `super_admin` membership; MFA required; bootstrap audit `17e46214-152d-466f-b092-0b086a2ac359` |
| PP-011 | Admin OTP works | successful + failed/expired OTP evidence | NOT STARTED |
| PP-012 | Admin membership enforced | unauthorised authenticated identity denied | NOT STARTED |
| PP-013 | Admin MFA/AAL2 works | TOTP enrol/challenge + privileged RPC before/after | NOT STARTED |
| PP-014 | Admin sign-out/session expiry | session invalidated and re-auth required | NOT STARTED |
| PP-020 | Venue created pending | Venue ID + pending status | NOT STARTED |
| PP-021 | Venue explicit approval | audit/status evidence | NOT STARTED |
| PP-022 | Venue Auth alone grants no authority | denied Venue access before invitation | NOT STARTED |
| PP-023 | Venue invitation scoped | exact user + exact Venue membership ID | NOT STARTED |
| PP-024 | Venue Terms gate | unpublished Terms cannot be treated as accepted/effective | EXPECTED BLOCKED |
| PP-025 | Venue role separation | Venue Admin vs View Only evidence | OPTIONAL / NOT STARTED |
| PP-030 | Worker Auth bootstrap controlled | approved phone + Auth user ID + bootstrap audit | PASS — ID-WRK-01 bootstrap audit `a14a2c6b-5d5e-443e-9790-a8bbc8c32d42`; bootstrap itself created no Venue, endpoint or activation |
| PP-031 | Worker SMS OTP works | actual delivery/sign-in evidence | IN PROGRESS — controlled Worker successfully reached onboarding; invalid-code evidence still required |
| PP-032 | Worker onboarding | Worker ID + public/private identity projection check | IN PROGRESS — one Worker record exists; projection/privacy acceptance evidence remains pending |
| PP-033 | Verification lifecycle | verification ID + approved evidence metadata + Admin decision | IN PROGRESS — one `not_started` verification has five registrations of one identical PDF; duplicate prevention is live, four legacy copies require controlled removal, identity claim/selfie/submission/Admin decision remain pending |
| PP-034 | Venue association lifecycle | Worker request + Venue confirmation/rejection | NOT STARTED |
| PP-035 | Venue privacy boundary | no Worker KYC/bank/Settlement-destination access | NOT STARTED |
| PP-036 | Worker Terms gate | activation blocked until current Terms published/accepted | EXPECTED BLOCKED |
| PP-037 | Settlement readiness gate | activation blocked until approved provider readiness | EXPECTED BLOCKED |
| PP-038 | Worker sign-out/session expiry | session invalidated and re-auth required | NOT STARTED |
| PP-040 | Worker activation gate | every missing condition independently blocks activation | NOT STARTED |
| PP-041 | Endpoint issuance | exactly one active endpoint only after legitimate activation | BLOCKED by Terms/provider gates |
| PP-050 | QR/short-code resolution | two-device QR + manual-code result | BLOCKED until legitimate endpoint exists |
| PP-051 | Public projection privacy | no surname/phone/KYC/bank/internal fields | BLOCKED until legitimate endpoint exists |
| PP-052 | Server quotes | R10/R20/R50/R100 values captured | BLOCKED until legitimate endpoint/intake state permits controlled test |
| PP-053 | Request resilience | invalid JSON=400, oversized=413, unsupported media=415, transient DB=503 | IMPLEMENTED; runtime execution pending |
| PP-054 | Tip idempotency | replay returns same economic resource | BLOCKED until controlled Customer path can open |
| PP-055 | Payment-disabled boundary | payment initiation fails closed while `PAYMENTS_ENABLED=false` | CODED; E2E pending |
| PP-056 | Browser return non-authoritative | return query cannot create Payment success | CODED; E2E pending |
| PP-057 | Anonymous receipt boundary | opaque receipt token required | CODED; E2E pending |
| PP-060 | Provider category/funds flow | written provider approval | EXTERNAL BLOCKER |
| PP-061 | Provider sandbox adapter | signed sandbox transaction trace | EXTERNAL BLOCKER |
| PP-062 | Webhook verification/replay | provider-specific signature/replay tests | EXTERNAL BLOCKER |
| PP-063 | Duplicate provider success | one operative success / one allocation set | DATABASE CONTROL EXISTS; provider E2E pending |
| PP-064 | Failed Settlement | provider-specific failure/retry evidence | EXTERNAL BLOCKER |
| PP-065 | Refund/chargeback | approved policy + provider mechanics | EXTERNAL BLOCKER |
| PP-070 | Legal entity/contact details | final legal drafting inputs | EXTERNAL/LEGAL BLOCKER |
| PP-071 | Worker Terms final | reviewed, approved, separately published | LEGAL BLOCKER |
| PP-072 | Venue Terms final | reviewed, approved, separately published | LEGAL BLOCKER |
| PP-073 | Customer Terms final | reviewed, approved, separately published | LEGAL BLOCKER |
| PP-074 | Privacy Notice final | reviewed, approved, separately published | LEGAL BLOCKER |
| PP-075 | Pricing final | approved active/effective Pricing Version | CONTROLLED DRAFT — review workflow plus persisted economics assumptions implemented; 8 blockers open; no approval, effective date or activation |
| PP-080 | Test cleanup complete | memberships/associations/endpoints/storage/Auth closed under constitution | NOT APPLICABLE YET |

## 26 August 2026 controlled checkpoint

- Canonical identity layer: 2 Auth users, 1 active Admin membership, 1 Worker and 1 not-started identity verification.
- Commercial layer: 0 Venues, 0 active endpoints, 0 active Pricing Versions, 0 effective published Terms and 0 active Pilots.
- Runtime layer: Public Tip intake `false`; intake readiness `false`.
- Existing Worker evidence consists of five registrations with one distinct file fingerprint. No file was deleted during this checkpoint.
- Interactive Admin OTP/TOTP, duplicate cleanup, identity details, live selfie, submission and Admin review remain deliberately pending.

## Evidence record template

```text
Test ID:
Timestamp:
Environment:
Git commit:
Database migration:
Actor/test identity reference:
Starting state:
Action:
Expected result:
Actual result:
Outcome: PASS / FAIL / BLOCKED
Canonical record IDs:
Audit-event references:
Screenshot/log references:
Cleanup action/status:
Tester:
Approver:
Notes:
```

Do not include OTPs, TOTP secrets, service-role keys, provider secrets, raw identity documents or full Settlement destination details in this register.

# SwiftTip MVP v3 — Pre-Pilot Evidence Matrix

Status: **CONTROLLED TEST TEMPLATE**

Use with `PRE_PILOT_E2E_READINESS.md`, `CONTROLLED_IDENTITY_TEST_PACK.md` and `PRE_PILOT_TEST_DATA_CONVENTION.md`. Missing external approval is recorded as `BLOCKED`, never converted into a synthetic pass.

| ID | Control | Expected evidence | Current state |
|---|---|---|---|
| PP-001 | Branch head identified | exact Git SHA | PASS — `mvp-v3-greenfield-build` synchronised at `3cfbcd83d8456bf7acc85d93219c028adf227ab1` |
| PP-002 | Current-head CI/build | `npm ci` + architecture + DB contract + schema freshness + migration safety + typecheck + tests + Next build | PASS — GitHub Actions run `32838517355`; exact-head `CI / test` succeeded through migration `0052`; 74 RPC contracts and 30 tests |
| PP-003 | Generated DB types current | `src/types/database.ts` provenance migration equals repo migration `0053` | PASS |
| PP-004 | Staging Supabase config explicit | deployed `/api/health` says `supabaseConfigSource=environment` | PASS — verified on deployment `dpl_GJm4kGnHQUoFaZuAH75jkAsmmynd` |
| PP-005 | Payments disabled | `/api/health`: `paymentsEnabled=false`, `liveMoneyReady=false` | PASS — verified on deployed production alias; provider remains unconfigured |
| PP-006 | Closed database control plane | `018_pre_pilot_control_plane.sql` | PASS previously under former duplicate 013 filename; rerun after any DB change |
| PP-007 | Branch protection ready | required-check name observed on a successful CI run | READY — exact required-check context observed as `CI / test`; branch configuration remains an owner action |
| PP-010 | Admin Auth identity controlled | approved test email + Auth user ID | NOT STARTED |
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
| PP-030 | Worker Auth bootstrap controlled | approved phone + Auth user ID + bootstrap audit | NOT STARTED |
| PP-031 | Worker SMS OTP works | actual delivery/sign-in evidence | NOT STARTED |
| PP-032 | Worker onboarding | Worker ID + public/private identity projection check | NOT STARTED |
| PP-033 | Verification lifecycle | verification ID + approved evidence metadata + Admin decision | NOT STARTED |
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

# SwiftTip MVP v3 — Pre-Pilot Evidence Matrix

Status: **CONTROLLED TEST TEMPLATE**

Use this matrix with `PRE_PILOT_E2E_READINESS.md`. It is intentionally stricter than an ordinary QA checklist: a missing external approval is recorded as `BLOCKED`, not converted into a synthetic pass.

| ID | Control | Expected evidence | Current state |
|---|---|---|---|
| PP-001 | Branch head identified | Git SHA recorded | READY TO RECORD |
| PP-002 | Current head CI/build | architecture + DB contract + migration safety + typecheck + tests + Next build | BLOCKED by current Vercel build-rate limit until another trusted runner verifies head |
| PP-003 | Generated DB types current | `src/types/database.ts` provenance migration equals latest repo migration | IMPLEMENTED |
| PP-004 | Staging DB configuration explicit | `/api/health` says `supabaseConfigSource=environment` | BLOCKED — currently `staging_fallback` |
| PP-005 | Payments disabled | `/api/health` says `paymentsEnabled=false`, `liveMoneyReady=false` | PASS |
| PP-006 | Closed database control plane | `013_pre_pilot_control_plane.sql` | PASS on canonical project |
| PP-010 | Admin Auth identity controlled | approved test email + Auth user ID | NOT STARTED |
| PP-011 | Admin OTP works | successful + failed/expired OTP evidence | NOT STARTED |
| PP-012 | Admin membership enforced | unauthorised authenticated user denied | NOT STARTED |
| PP-013 | Admin MFA/AAL2 works | TOTP enrol/challenge + privileged RPC before/after evidence | NOT STARTED |
| PP-020 | Venue created pending | Venue ID + status | NOT STARTED |
| PP-021 | Venue explicit approval | audit/status evidence | NOT STARTED |
| PP-022 | Venue Auth alone grants no authority | denied Venue access before invitation | NOT STARTED |
| PP-023 | Venue invitation scoped | exact user + exact Venue membership ID | NOT STARTED |
| PP-024 | Venue Terms gate | unpublished Terms cannot be accepted as effective | EXPECTED BLOCKED |
| PP-030 | Worker Auth bootstrap controlled | approved test phone + Auth user ID + bootstrap audit | NOT STARTED |
| PP-031 | Worker SMS OTP works | actual delivery/sign-in evidence | NOT STARTED |
| PP-032 | Worker onboarding | Worker ID + public/private identity projection check | NOT STARTED |
| PP-033 | Verification lifecycle | verification ID + approved evidence metadata + Admin decision | NOT STARTED |
| PP-034 | Venue association lifecycle | request + Venue confirmation/rejection | NOT STARTED |
| PP-035 | Venue privacy boundary | Venue cannot access Worker KYC/banking/Settlement destination | NOT STARTED |
| PP-036 | Worker Terms gate | activation blocked until current Terms published/accepted | EXPECTED BLOCKED |
| PP-037 | Settlement readiness gate | activation blocked until provider-approved readiness | EXPECTED BLOCKED |
| PP-040 | Worker activation gate | every missing condition independently blocks activation | NOT STARTED |
| PP-041 | Endpoint issuance | exactly one active endpoint only after legitimate activation | BLOCKED by Terms/provider gates |
| PP-050 | QR/short-code resolution | two-device QR + manual-code result | BLOCKED until legitimate endpoint exists |
| PP-051 | Public projection privacy | no legal surname/phone/KYC/bank/internal fields | BLOCKED until legitimate endpoint exists |
| PP-052 | Server quotes | R10/R20/R50/R100 values captured | BLOCKED until legitimate endpoint/intake gates permit test |
| PP-053 | Request resilience | invalid JSON=400, oversized=413, unsupported media=415, transient DB=503 | IMPLEMENTED; runtime execution pending |
| PP-054 | Tip idempotency | replay returns same economic resource | BLOCKED until controlled customer path can open |
| PP-055 | Payment-disabled boundary | payment initiation fails closed while `PAYMENTS_ENABLED=false` | CODED; end-to-end execution pending |
| PP-056 | Browser return non-authoritative | `status=success` cannot create Payment success | CODED; end-to-end execution pending |
| PP-057 | Anonymous receipt boundary | opaque receipt token required | CODED; end-to-end execution pending |
| PP-060 | Provider category/funds flow | written provider approval | EXTERNAL BLOCKER |
| PP-061 | Provider sandbox adapter | signed sandbox transaction trace | EXTERNAL BLOCKER |
| PP-062 | Webhook verification/replay | exact provider signature/replay tests | EXTERNAL BLOCKER |
| PP-063 | Duplicate provider success | one operative success / one allocation set | DATABASE CONTROL EXISTS; provider E2E pending |
| PP-064 | Failed Settlement | provider-specific failure/retry evidence | EXTERNAL BLOCKER |
| PP-065 | Refund/chargeback | approved policy + provider mechanics | EXTERNAL BLOCKER |
| PP-070 | Legal entity/contact details | final legal drafting inputs | EXTERNAL/LEGAL BLOCKER |
| PP-071 | Worker Terms final | reviewed, approved, then separately published | LEGAL BLOCKER |
| PP-072 | Venue Terms final | reviewed, approved, then separately published | LEGAL BLOCKER |
| PP-073 | Customer Terms final | reviewed, approved, then separately published | LEGAL BLOCKER |
| PP-074 | Privacy Notice final | reviewed, approved, then separately published | LEGAL BLOCKER |
| PP-075 | Pricing final | approved Pricing Version, not merely draft | COMMERCIAL BLOCKER |
| PP-080 | Test cleanup complete | memberships/associations/endpoints/storage/Auth handled under cleanup constitution | NOT APPLICABLE YET |

## Evidence record template

For each executed item record:

```text
Test ID:
Timestamp:
Environment:
Git commit:
Database migration:
Actor/test identity:
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

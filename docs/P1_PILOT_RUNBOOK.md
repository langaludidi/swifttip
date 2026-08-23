# SwiftTip MVP v3 — P1 Pilot Operating Runbook

Status: PRE-LIVE / CONTROLLED DRAFT

This runbook does **not** authorise real-money operation. `PAYMENTS_ENABLED` remains `false` until every go-live gate in `GO_LIVE_GATE.md` and `PROVIDER_INTEGRATION_GATE.md` is satisfied.

## 1. P1 objective

P1 proves that SwiftTip can execute the complete controlled transaction and operating model at one real Venue with approximately 5–10 Workers before broader pilot expansion.

P1 must prove four things simultaneously:

1. Customers can identify the correct verified Worker and complete a Tip reliably.
2. Workers can receive attributable gratuities and understand gross, SwiftTip fee, net entitlement and Settlement state.
3. Venue administration remains lightweight and does not become payroll, banking or Worker-surveillance infrastructure.
4. SwiftTip produces positive transaction contribution and an auditable Payment → Allocation → Settlement → Reconciliation record.

## 2. Non-negotiable pre-live gates

Before real money is enabled:

- Vercel preview/staging is connected to the canonical Supabase project.
- Production environment is separately configured and tested.
- Real Worker OTP works; there is no shared or hard-coded OTP.
- Admin MFA reaches AAL2 and Admin roles are assigned explicitly.
- Venue terms, Worker terms, customer transaction terms and privacy notice have been reviewed, versioned, hashed, published and are reviewable in-app.
- The approved pricing version is explicitly activated; draft pricing is never treated as active.
- Payment provider has confirmed the SwiftTip category and funds flow in writing.
- Split-at-source or equivalent non-custodial mechanics are confirmed.
- Worker/provider KYC and Settlement account model are confirmed.
- Provider processing, split and Settlement fees are known.
- Customer SwiftTip service-fee treatment is provider/legal approved.
- Webhook signing/verification and replay protection are tested.
- Refund mechanics are documented.
- Post-Settlement chargeback liability is explicitly documented.
- Failed Settlement handling is documented and tested.
- Reconciliation evidence and provider reports/API fields are understood.
- Full database smoke suites pass.
- Supabase security advisor findings are reviewed and intentional public RPCs documented.
- `PAYMENTS_ENABLED=false` until the final controlled switch.

## 3. P1 constitution sequence

### A. Create Venue

Operations Admin creates the Venue in the SwiftTip Venue Register.

Venue begins as `pending_review` and is approved to `active` only after the participating location is verified operationally.

Venue approval does not make the Venue merchant of record, custodian of Worker funds, payroll administrator or Settlement authority.

### B. Create Venue user

The Venue user authenticates by the configured secure method.

Operations Admin invites the exact Auth user to the exact Venue. Authentication alone grants no Venue access.

The Venue user reviews the published Venue terms, accepts the recorded version, then accepts the membership invitation.

### C. Onboard Workers

For each Worker:

1. Secure Worker OTP authentication.
2. Create private Worker identity and public display identity.
3. Submit SwiftTip identity evidence.
4. Verification Admin reviews evidence.
5. Worker requests relationship with the participating Venue.
6. Venue Admin confirms the real Worker–Venue relationship.
7. Approved provider completes Settlement/KYC readiness.
8. Worker reads and accepts the published Worker terms.
9. Database independently evaluates activation gates.
10. Worker activation occurs only when every gate passes.
11. Active QR/short-code/public endpoint is issued/confirmed.

No Operations user may manually bypass these gates.

## 4. Pre-money dry run

Before enabling provider payment:

- Scan each Worker QR from at least two ordinary mobile devices.
- Enter each Worker short code manually.
- Confirm the public Worker projection contains only intended public fields.
- Check no legal surname, KYC evidence, phone number or banking information appears publicly.
- Test R10, R20, R50 and R100 server quotes.
- Verify the customer service fee and total are server-authoritative.
- Verify high-value confirmation behaviour at the configured threshold.
- Create a canonical Tip session with payments disabled and confirm the system fails closed at the provider boundary.
- Verify the anonymous receipt token cannot be derived from the SwiftTip reference alone.
- Verify `/payment/result` does not trust `status=success` or equivalent browser query parameters.
- Verify Worker, Venue and Admin users cannot access one another’s restricted records.
- Verify Venue users cannot see Worker banking/KYC or individual earnings rankings.
- Verify Admin MFA is required for privileged Admin RPCs.

## 5. Controlled go-live switch

Go-live requires a named approver and a timestamped checklist record.

Order:

1. Freeze deployment changes for the launch window.
2. Confirm current database migration version and smoke-test result.
3. Confirm provider production credentials are server-only.
4. Confirm webhook endpoint signature verification with a provider production/test event as appropriate.
5. Confirm active pricing version exactly matches approved commercial terms.
6. Confirm effective legal versions are the versions shown to Worker/Venue/customer.
7. Confirm one P1 Venue and intended Workers only.
8. Confirm reconciliation monitoring is ready.
9. Set `PAYMENTS_ENABLED=true` only after all preceding checks are signed off.
10. Execute one controlled low-value real-money transaction.
11. Trace it end-to-end before opening the Venue to broader P1 transactions.

## 6. First transaction trace

For the first live Tip confirm:

- Tip reference exists.
- Provider Payment Attempt exists.
- Provider Payment evidence is recorded.
- Exactly one successful attempt is designated economically operative.
- Duplicate provider success cannot create a second Worker allocation.
- Financial Allocations equal:
  - Worker net entitlement
  - SwiftTip Worker success fee
  - SwiftTip customer service fee
- Expected Settlement record exists for Worker net entitlement.
- Provider costs are captured separately from SwiftTip gross revenue.
- Worker sees `Received / Processing / Settlement pending / Settled / Exception` language only.
- Customer receipt says payment/Tip received, never that Worker funds have settled unless that separate state is genuinely proven.
- Reconciliation record closes without unexplained material mismatch.

Do not expand customer traffic until this trace is clean.

## 7. Daily P1 operations

Every pilot day Operations should review:

- Payment failures and completion rate.
- Settlement exceptions.
- Reconciliation exceptions.
- Verification queue.
- Worker/Venue association requests.
- Refund records.
- Disputes/evidence deadlines.
- Support cases.
- In-app operational notifications.
- Provider cost records.
- Pilot scorecard.

Finance/Admin users must not “repair” financial records by editing completed Tips, Allocations or Settlements. Corrections use the controlled adjustment/refund/dispute architecture.

## 8. Pilot measurement thresholds

Approved working thresholds:

- Customer profile-to-success: internal target ≥30%.
- Payment completion after initiation: ≥90%.
- Customer fee abandonment warning: >25%.
- Worker activation rate: ≥75%.
- Weekly active Worker rate: ≥60%.
- Worker fee acceptance: ≥70%.
- Worker retention: ≥70% for Workers with 3+ transactions.
- Transaction contribution must be positive.
- Target contribution per successful Tip: ≥R1.50; stronger evidence ≥R2.50.
- Contribution per active Worker per month: proof target R100; strong ≥R150.
- Venue continuation willingness: ≥75%.
- Venue Admin burden: ≤15 minutes/week after setup.
- Venue activation target: ≤2 hours operational work excluding external reviews.
- Worker onboarding target: 10–15 minutes excluding provider/verification waiting time.
- Payment platform reliability: ≥98%.
- Settlement success: ≥98%.
- ≥95% of Settlements within the provider’s normal confirmed window.
- Reconciliation: ≥99.5%, with zero material unexplained mismatch.
- Refund warning: >2% of successful Tips.
- Dispute warning: ≥0.5%.
- Support burden: <5 cases per 100 Tips.
- Manual financial-review rate: <2%.

P1 expansion should not be based on transaction count alone. Commercial contribution, Worker acceptance, customer completion, operational burden and financial integrity all matter.

## 9. Stop / kill-switch conditions

Immediately disable new payments if any of the following occurs:

- Provider instructs SwiftTip to stop processing.
- Evidence suggests SwiftTip is taking custody of Worker principal contrary to the approved model.
- Webhook signatures cannot be verified reliably.
- Duplicate Payment success creates or risks duplicate Worker entitlement.
- Material unexplained reconciliation mismatch occurs.
- Settlement failures become systemic rather than isolated.
- Worker Settlement destinations appear compromised or account-takeover is suspected.
- Pricing shown to customer differs from amount charged.
- Worker fee deducted differs from the accepted pricing snapshot.
- RLS or cross-tenant/cross-role data leakage is found.
- A critical security incident occurs.
- Refund/chargeback handling creates an unresolved material Worker-funds liability.

Kill switch action: set `PAYMENTS_ENABLED=false`. Preserve existing records and continue reconciliation/support on already-created transactions. Do not delete or rewrite financial history.

## 10. Incident priority

### P0 — stop payments

Financial-integrity breach, custody risk, payment amount mismatch, material data exposure, webhook compromise, duplicate entitlement, systemic Settlement failure.

### P1 — immediate operational response

Single Settlement exception, suspected Worker account takeover, critical verification error, dispute deadline, significant reconciliation exception.

### P2 — same-day response

Worker/Venue onboarding problem, individual support case, non-systemic payment failure.

### P3 — backlog

UX improvement, non-critical copy issue, analytics refinement.

## 11. P1 exit decision

At the end of the defined P1 window, record one of:

- `EXPAND` — economics, reliability, Worker/customer adoption and operations support progression.
- `CONTINUE P1` — evidence insufficient but no fundamental failure.
- `REWORK` — product/provider/pricing or operating model needs material correction.
- `STOP` — regulatory, funds-flow, security or unit-economics model is not viable.

Do not silently change thresholds after seeing pilot results. Any change must be versioned as a new pilot decision.

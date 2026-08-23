# SwiftTip MVP v3 — Legal Review Matrix

**Status: PRE-LIVE CONTROL DOCUMENT**

This matrix coordinates the four v0.1 legal drafts. It is not legal advice, does not approve any clause and does not authorise publication or live payments.

## Controlled documents

| Document | Database type | Current state | Publication state |
|---|---|---|---|
| Worker Terms v0.1 | `worker_terms` | Draft | Unpublished |
| Venue Terms v0.1 | `venue_terms` | Draft | Unpublished |
| Customer Transaction Terms v0.1 | `customer_transaction_terms` | Draft | Unpublished |
| Privacy Notice v0.1 | `privacy_notice` | Draft | Unpublished |

All four drafts use a 2099 effective date as a safety placeholder. The date has no operative legal effect while `published_at` is null.

## Review principle

A blocker should be resolved once at source and then propagated consistently across every affected document and product screen. No document should be cleared by inserting wording that is inconsistent with the actual provider contract, financial architecture, privacy data flow or product behaviour.

## Decision matrix

| Decision / evidence required | Primary owner | Worker Terms | Venue Terms | Customer Terms | Privacy Notice | Product / technical consequence |
|---|---|---:|---:|---:|---:|---|
| SwiftTip operating legal entity, registration details and legal-notices address | Corporate / Legal | ✓ | ✓ | ✓ | ✓ | Footer, receipts, legal pages, complaints and contracting identity |
| Information Officer and privacy contact details | Privacy / Legal |  |  |  | ✓ | Privacy page, DSAR and incident workflows |
| Approved Payment Provider | Commercial / Payments | ✓ | ✓ | ✓ | ✓ | Provider adapter, credentials and disclosures |
| Merchant/acquiring/funds-flow position | Payments / Legal | ✓ | ✓ | ✓ | ✓ | Determines actual payment chain and contractual roles |
| Non-custodial split-at-source or approved equivalent | Payments / Legal | ✓ | ✓ | ✓ |  | Must remain consistent with no-Wallet architecture |
| Worker KYC / subaccount / Settlement responsibilities | Provider / Compliance | ✓ |  |  | ✓ | Worker activation and Settlement profile flow |
| Final Worker Success Fee | Commercial / Legal | ✓ |  | ✓ |  | Pricing Version and Worker disclosure |
| Final Customer Service Fee wording and provider approval | Commercial / Provider / Legal |  |  | ✓ |  | Checkout fee label and total-price disclosure |
| Provider processing, split and Settlement costs | Finance / Provider | ✓ |  | ✓ |  | Unit economics, Pricing Version, contribution measurement |
| Refund mechanics and fee treatment | Provider / Legal / Finance | ✓ |  | ✓ | ✓ | Refund workflow can move beyond read-only only after approval |
| Post-Settlement chargeback liability | Provider / Legal / Finance | ✓ |  | ✓ |  | Must not create an undisclosed negative Worker Wallet or hidden debt |
| Failed Settlement process | Provider / Operations | ✓ |  |  | ✓ | Settlement exception handling and Worker communications |
| Tax / VAT / accounting treatment of SwiftTip fees | Tax / Finance | ✓ |  | ✓ |  | Invoicing, accounting and fee wording |
| Treatment of Worker gratuity records for tax/reporting purposes | Tax / Legal | ✓ |  |  | ✓ | Worker statements and retention |
| Venue position in payment chain | Provider / Legal |  | ✓ | ✓ | ✓ | Must not accidentally make Venue custodian/MoR/payroll operator |
| Venue contracting authority representation | Legal / Operations |  | ✓ |  |  | Venue invitation/acceptance wording |
| POPIA responsible-party/operator allocation | Privacy / Legal |  | ✓ |  | ✓ | Processor contracts and data-sharing language |
| Final data inventory and lawful processing basis | Privacy / Legal |  |  |  | ✓ | Collection fields and privacy notices |
| Subprocessors and cross-border processing | Privacy / Security |  |  |  | ✓ | Vendor register and transfer safeguards |
| Retention schedule | Legal / Privacy / Finance | ✓ | ✓ | ✓ | ✓ | Deletion/de-identification jobs and record holds |
| OTP/email/SMS provider data flows | Security / Privacy |  |  |  | ✓ | Authentication and notification provider configuration |
| Analytics/cookie configuration | Product / Privacy |  |  | ✓ | ✓ | Consent/banner decision and tracking restrictions |
| Minimum age / children position | Legal / Provider | ✓ |  | ✓ | ✓ | Eligibility and onboarding validation |
| Liability / indemnity framework | Legal | ✓ | ✓ | ✓ |  | Final contracting clauses |
| Complaints and external escalation routes | Legal / Operations | ✓ | ✓ | ✓ | ✓ | Support and legal pages |
| Incident and breach contacts/process | Security / Privacy |  |  |  | ✓ | Incident runbook and notification workflow |
| Provider-contract/product consistency review | Legal / Product / Engineering | ✓ | ✓ | ✓ | ✓ | Mandatory final pre-publication review |

## Cross-document consistency rules

1. **Funds flow must have one truth.** Worker, Venue and Customer documents must describe the same approved payment chain.
2. **Fees must have one truth.** The legal documents, active Pricing Version and checkout UI must use the same fee rules and labels.
3. **Payment success and Settlement remain separate.** No legal or customer copy may collapse these states.
4. **No hidden custody.** No document may imply SwiftTip holds a Worker Wallet unless the architecture is formally changed and re-approved.
5. **Venue scope stays narrow.** Venue participation must not silently become payroll, KYC review, Worker banking access or Settlement administration.
6. **Privacy wording follows actual data flows.** The Privacy Notice must not promise South-African-only storage, no subprocessors, or specific retention periods unless technically and contractually verified.
7. **Refund and chargeback wording follows provider mechanics.** The product must not create a Worker clawback, negative balance, reserve or set-off without explicit approved legal and commercial treatment.
8. **Published versions are immutable.** Any material change after publication requires a new version.

## Review sequence

### Gate L1 — Corporate identity

Resolve the SwiftTip contracting entity, formal contacts, legal-notices address and Information Officer details.

### Gate L2 — Payment-provider architecture

Obtain written provider confirmation covering category approval, merchant/acquiring position, funds flow, split mechanics, Worker onboarding/KYC, Settlement, fees, refunds, disputes, chargebacks and reconciliation.

### Gate L3 — Commercial and tax

Confirm the approved Pricing Version, Customer Service Fee treatment, Worker Success Fee, VAT/accounting treatment and unit economics using actual provider costs.

### Gate L4 — Privacy and security

Complete the data inventory, vendor/subprocessor register, cross-border review, retention schedule, communications-provider flows, data-subject request process and incident contacts.

### Gate L5 — Legal drafting review

Update all four drafts from the resolved decisions. Record remaining blockers in the Admin Legal workspace. A formal review must be recorded before approval.

### Gate L6 — Product consistency review

Compare the approved draft wording against the actual live screens, database states, provider integration, receipt copy, Worker dashboard, Venue boundary and support processes.

### Gate L7 — Approval

Clear the blocker list and approve the exact hashed version. **Approval is not publication.**

### Gate L8 — Controlled publication — not yet implemented

Publication requires a separate future control, explicit effective date, named approver, audit event and regression checks. No publication function or UI currently exists.

## Current stop position

The project must remain pre-live while any of the following is true:

- no approved Payment Provider;
- no active approved Pricing Version;
- any required legal document is unpublished;
- Worker/provider Settlement mechanics are unresolved;
- refund/chargeback loss allocation is unresolved; or
- `PAYMENTS_ENABLED` is false.

At the current stage these conditions deliberately keep live money disabled.

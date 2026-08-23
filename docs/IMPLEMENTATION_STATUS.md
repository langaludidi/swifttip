# SwiftTip MVP v3 — Implementation Status

Current environment: PRE-LIVE / STAGING BUILD

Canonical Supabase project: `bxtfcfuehqljedxwykfk`

Greenfield branch: `mvp-v3-greenfield-build`

## Completed

### Application foundation

- Next.js / TypeScript greenfield application structure.
- Customer, Worker, Venue and Admin surfaces.
- Approved customer-first visual direction with dominant Tip a Worker action.
- QR scan, short-code resolution and verified Worker public profile flow.
- Server-authoritative Tip quoting and Tip creation contracts.
- Anonymous customer receipt/status architecture.
- Browser payment-return route is non-authoritative and cannot declare Payment success.
- Real OTP application flows are scaffolded; no universal/hard-coded OTP exists.

### Canonical database

Migrations are applied through `mvp_v3_0034_legal_acl_hardening`.

Implemented domains include Users/Workers, Venues/memberships, Worker–Venue associations, Worker verification, Provider Settlement profiles, tipping endpoints, Pricing Versions, legal/terms versions and acceptance evidence, Pilot cohorts, Tips/Payment Attempts, operative successful Payment Attempt designation, Financial Allocations, Settlements/events, Refunds, Disputes, provider fees/financial adjustments, reconciliation, support, Admin RBAC, audit events and in-app operational notifications.

### Financial integrity

- Integer-cent ZAR economics and server-authoritative pricing.
- Financial snapshots stored on the Tip.
- Duplicate successful provider attempts can be preserved while only one becomes economically operative.
- Payment success and Worker Settlement are distinct states.
- No Wallet, withdrawal, cash-out, payout-request or payout-batch architecture.
- Financial record deletion and completed-Tip snapshot protections.
- Provider costs stored separately from SwiftTip gross transaction revenue.
- Refund and Dispute operations are visible but read-only until provider/policy mechanics are approved.

### Access control / security

- RLS across canonical application-facing tables.
- Worker- and Venue-specific projections without KYC/banking leakage.
- Admin role-specific RPCs with MFA/AAL2 for privileged Admin functions.
- Anonymous RPC exposure limited to intended customer entry/receipt/effective-legal-reading paths.
- Unpublished legal drafts are not directly readable or writable by `anon` or ordinary `authenticated` PostgREST roles.
- Legal Admin access is through audited MFA/RBAC-gated RPCs only.
- Private Worker verification evidence architecture.
- Webhook/idempotency foundations.
- Payment kill switch: `PAYMENTS_ENABLED=false` by default.

### Worker operating flow

- Worker login/OTP, onboarding and identity-evidence workflow.
- Venue discovery and Worker association request.
- Database-enforced activation gates.
- Worker terms must be published, reviewable and accepted before activation.
- Worker dashboard, QR, transactions, detail, profile and support.
- In-app notifications for verification, Venue relationship, support and Settlement state changes.

### Venue operating flow

- Venue email OTP flow.
- Invitation-based access: authentication alone grants no Venue access.
- Operations creates/approves Venues.
- Venue user accepts published Venue terms and membership invitation.
- Venue Worker confirmation/decline/end-association controls.
- Venue dashboard exposes aggregate operational information only.

### Legal document architecture

Four controlled pre-live legal drafts are stored in both the repository and canonical database:

- Worker Terms v0.1 draft.
- Venue Terms v0.1 draft.
- Customer Transaction Terms v0.1 draft.
- Privacy Notice v0.1 draft.

All four are:

- `review_status = draft`;
- `published_at = null`;
- assigned a 2099 safety-placeholder effective date;
- SHA-256 hashed using the canonical content body; and
- accompanied by machine-readable publication blockers.

The Admin Legal workspace supports:

1. draft editing;
2. submission for review;
3. formal review findings/blockers;
4. return to draft;
5. approval only after blockers are cleared.

Approval does **not** publish a document. There is no legal publication RPC or UI control.

The commercial-readiness projection separately reports draft, under-review and approved-unpublished legal versions so drafting progress cannot be mistaken for legal go-live readiness.

### Admin / pilot operations

- Operations dashboard and Worker verification queue.
- Venue register.
- Legal document register and controlled review workflow.
- Draft-only Pilot cohort setup and Venue assignment; no Pilot activation action.
- Settlement exception and transaction/reconciliation detail.
- Refund and Dispute queue/detail, read-only.
- Support triage and restricted audit trail.
- Commercial readiness panel and evidence-based Pilot scorecard.
- P1 Pilot operating runbook and kill-switch procedure.

### Verification

Database smoke suites cover:

1. Canonical schema/RLS/forbidden-wallet assertions.
2. Worker onboarding and operational controls.
3. Venue/Pilot/legal/receipt controls.
4. In-app notification controls.
5. Legal draft hash/publication/ACL controls.

All five suites have been executed against the canonical Supabase project and pass after corrections.

## Intentionally inactive

Current database state remains pre-live:

- Active pricing versions: `0`.
- Effective published legal/terms versions: `0`.
- Active Workers: `0`.
- Active Venues: `0`.
- Active tipping endpoints: `0`.
- Active Pilot cohorts: `0`.
- Live payment provider: not configured.
- Real payments: disabled.

## Remaining manual / external gates

### Vercel staging connection

The Preview deployment still requires the canonical Supabase public URL/publishable key to be attached as Vercel Preview environment variables if not already configured. Environment secrets must remain server/environment controlled.

### Authentication

- Configure/test real Worker SMS OTP delivery.
- Confirm Venue email OTP template/behaviour.
- Create controlled Worker, Venue User and Admin test identities.
- Enrol Admin MFA and verify AAL2 end to end.

### Legal/commercial

The four drafts now exist. Remaining work is to review and resolve their recorded blockers, including:

- SwiftTip legal entity and formal contacts;
- Information Officer/privacy administration details;
- final Pricing Version and fee treatment;
- provider and funds-flow confirmation;
- refunds/reversals/post-Settlement chargeback loss allocation;
- tax/VAT/accounting treatment;
- data-sharing/cross-border/retention controls; and
- final liability, complaints and dispute clauses.

No document should be published until those reviews are complete. Pricing remains inactive.

### Payment provider

No provider-specific implementation may go live until the provider gate resolves category approval, merchant/funds-flow position, split mechanics, Worker KYC/subaccount model, Settlement destination/schedule, Customer service-fee treatment, complete provider pricing, signed webhook behaviour, Refund mechanics, failed Settlement process, post-Settlement chargeback liability, reconciliation fields and production credentials/contractual approval.

## Repository note

The MVP v3 work remains isolated on the greenfield branch of `langaludidi/swifttip`. The legacy implementation is historical reference only and is not the architectural dependency for MVP v3.

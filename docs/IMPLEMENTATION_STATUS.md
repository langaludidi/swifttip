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

Migrations are applied through `mvp_v3_0028_in_app_notifications`.

Implemented domains include:

- Users / Workers.
- Venues / Venue memberships.
- Worker–Venue associations.
- SwiftTip Worker verification.
- Provider Settlement profiles.
- Worker tipping endpoints.
- Pricing versions.
- Immutable legal/terms versions and acceptance evidence.
- Pilot cohorts.
- Tips and Payment Attempts.
- Operative successful Payment Attempt designation.
- Financial Allocations.
- Settlements and Settlement events.
- Refunds.
- Disputes.
- Provider fees and financial adjustments.
- Reconciliation records.
- Support cases.
- Admin membership/RBAC.
- Audit events.
- In-app operational notifications.

### Financial integrity

- Integer-cent ZAR economics.
- Financial snapshots stored on the Tip.
- Server-authoritative pricing.
- Duplicate successful provider attempts can be preserved while only one becomes economically operative.
- Payment success and Worker Settlement are distinct states.
- No Wallet, withdrawal, cash-out, payout-request or payout-batch architecture.
- Financial record deletion protections.
- Completed Tip financial snapshot protections.
- Provider costs stored separately from SwiftTip gross transaction revenue.
- Refund and Dispute operations are visible but remain read-only until provider/policy mechanics are approved.

### Access control / security

- RLS across canonical application-facing tables.
- Worker-specific projections.
- Venue-specific projections without KYC/banking exposure.
- Admin role-specific RPCs.
- Admin MFA/AAL2 required by privileged Admin functions.
- Anonymous RPC exposure limited to intended customer entry/receipt/legal-reading paths.
- Private Worker verification evidence architecture.
- Webhook/idempotency foundations.
- Payment kill switch: `PAYMENTS_ENABLED=false` by default.

### Worker operating flow

- Worker login/OTP screens.
- Worker profile onboarding.
- Identity-evidence upload and Verification Admin review.
- Venue discovery and Worker association request.
- Database-enforced activation gates.
- Worker terms must be published, reviewable and accepted before activation.
- Worker dashboard, QR, transactions, transaction detail, profile and support.
- In-app notifications for verification, Venue relationship, support and Settlement state changes.

### Venue operating flow

- Venue email OTP flow.
- Invitation-based access: authentication alone grants no Venue access.
- Operations creates/approves Venues.
- Venue user accepts published Venue terms and membership invitation.
- Venue Worker confirmation/decline/end-association controls.
- Venue dashboard exposes aggregate operational information only.

### Admin / pilot operations

- Operations dashboard.
- Worker verification queue and evidence review.
- Venue register.
- Draft-only pilot cohort setup and Venue assignment.
- No pilot activation function or Start Pilot UI exists yet.
- Settlement exception view.
- Transaction and reconciliation detail.
- Refund queue/detail, read-only.
- Dispute queue/detail, read-only.
- Support queue and triage.
- Restricted audit trail.
- Commercial readiness panel.
- Evidence-based pilot scorecard.
- P1 pilot operating runbook and kill-switch procedure.

### Verification

Database smoke suites cover:

1. Canonical schema/RLS/forbidden-wallet assertions.
2. Worker onboarding and operational controls.
3. Venue/pilot/legal/receipt controls.
4. In-app notification controls.

The current suites have been executed against the canonical Supabase project and pass after corrections.

Vercel greenfield-branch builds are compiling successfully.

## Intentionally inactive

Current database state remains pre-live:

- Active pricing versions: `0`.
- Effective published legal/terms versions: `0`.
- Active Workers: `0`.
- Active Venues: `0`.
- Active tipping endpoints: `0`.
- Active pilot cohorts: `0`.
- Live payment provider: not configured.
- Real payments: disabled.

## Remaining manual / external gates

### Vercel staging connection

The Preview deployment still requires the canonical Supabase public URL/publishable key to be attached as Vercel Preview environment variables. The connected Vercel integration cannot write environment variables directly.

### Authentication

- Configure/test real Worker SMS OTP delivery in the canonical Supabase project.
- Confirm Venue email OTP template/behaviour.
- Create controlled test identities for Worker, Venue user and Admin.
- Enrol Admin MFA and verify AAL2 end to end.

### Legal/commercial

- Draft and review Worker terms.
- Draft and review Venue terms.
- Draft and review customer transaction terms.
- Draft and review privacy notice.
- Store exact content, verify SHA-256 content hash and publish approved versions only.
- Approve/activate a pricing version only after commercial/legal confirmation.

### Payment provider

No provider-specific implementation may go live until the provider gate resolves:

- category approval;
- merchant-of-record/funds-flow position;
- split-at-source mechanics;
- Worker subaccount/KYC model;
- Settlement destination and schedule;
- customer service-fee treatment;
- fee bearer and complete provider pricing;
- signed webhooks/replay behaviour;
- Refund mechanics and fee treatment;
- failed Settlement process;
- post-Settlement chargeback liability;
- reconciliation evidence/API/reporting fields;
- production credentials and contractual approval.

## Repository note

The MVP v3 work remains isolated on the greenfield branch of `langaludidi/swifttip`. The legacy implementation is historical reference only and is not the architectural dependency for MVP v3.

# SwiftTip MVP v3 — Implementation Status

Current environment: PRE-LIVE / STAGING BUILD

Canonical Supabase project: `bxtfcfuehqljedxwykfk`

Greenfield branch: `mvp-v3-greenfield-build`

## Completed

### Application foundation

- Next.js / TypeScript greenfield application structure.
- Customer, Worker, Venue and Admin surfaces.
- Approved customer-first visual direction with dominant Tip a Worker action.
- UI/UX polish across Customer, Worker, Venue, Admin, authentication, onboarding, verification, QR, support, transactions and global loading/error/not-found states.
- QR scan, short-code resolution and verified Worker public profile flow.
- Server-authoritative Tip quoting and Tip creation contracts.
- Anonymous customer receipt/status architecture.
- Browser payment-return route is non-authoritative and cannot declare Payment success.
- Real OTP application flows are scaffolded; no universal/hard-coded OTP exists.

### Canonical database

Migrations are applied through `mvp_v3_0035_legal_source_synchronisation`.

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
- Dedicated Admin email-OTP sign-in, pre-provisioned-account policy, TOTP enrollment and AAL2 challenge flow implemented in the branch.
- Anonymous RPC exposure limited to intended customer entry/receipt/effective-legal-reading paths.
- Unpublished legal drafts are not directly readable or writable by `anon` or ordinary `authenticated` PostgREST roles.
- Legal Admin access is through audited MFA/RBAC-gated RPCs only.
- Private Worker verification evidence architecture.
- Webhook/idempotency foundations.
- Payment kill switch: `PAYMENTS_ENABLED=false` by default.
- Staging Supabase fallback is limited to the canonical public project URL/publishable key; production remains fail-closed and requires explicit environment configuration.

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
- SHA-256 hashed using the canonical content body;
- accompanied by machine-readable publication blockers; and
- source-locked to the repository path, Git blob SHA and exact byte length.

Migration `0035` verifies exact source byte lengths and content hashes transactionally. Current canonical values are 10,859 bytes (Customer), 14,023 bytes (Privacy), 12,132 bytes (Venue) and 12,894 bytes (Worker), all hash-valid and unpublished.

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
- Dedicated Admin authentication flow now routes unauthenticated Admins to `/admin/login` and MFA-required sessions to `/admin/mfa` instead of a generic unavailable screen.

### Verification

Database smoke suites cover:

1. Canonical schema/RLS/forbidden-wallet assertions.
2. Worker onboarding and operational controls.
3. Venue/Pilot/legal/receipt controls.
4. In-app notification controls.
5. Legal draft hash/publication/ACL controls.

All five suites have been executed against the canonical Supabase project and pass after corrections.

Runtime configuration tests now also assert that the canonical Supabase fallback is staging-only, production remains fail-closed without explicit environment variables, explicit variables override the fallback and database readiness cannot enable payments by itself.

## Current staging runtime

The Vercel branch preview is now connected to the canonical Supabase project using the staging-only public fallback because the Vercel Preview environment variables were not reaching runtime.

Last verified deployed health state:

- `environment = staging`;
- Supabase URL present;
- Supabase publishable key present;
- `databaseConfigured = true`;
- `paymentProviderConfigured = false`;
- `paymentsEnabled = false`;
- `liveMoneyReady = false`.

The public publishable key is not a service-role credential. RLS/RPC authorization remains the data-access boundary. No service-role key is committed.

The newest Admin auth/MFA commits are currently awaiting a Vercel build because the account hit Vercel's build-rate limit. The preceding connected staging build compiled successfully through production build/type checking/static generation.

## Intentionally inactive

Current database state remains pre-live:

- Auth users: `0` at the last direct check.
- Active pricing versions: `0`.
- Effective published legal/terms versions: `0`.
- Active Workers: `0`.
- Active Venues: `0`.
- Active tipping endpoints: `0`.
- Active Pilot cohorts: `0`.
- Live payment provider: not configured.
- Real payments: disabled.

## Remaining manual / external gates

### Authentication / controlled test identities

- Configure/test real Worker SMS OTP delivery.
- Confirm Venue/Admin email OTP template and delivery behaviour.
- Provision the first authorised Admin Auth identity and corresponding active `admin_memberships` record through an approved Admin/Auth route; the Admin login screen deliberately does not self-create privileged accounts.
- Create controlled Worker and Venue User test identities.
- Enrol Admin TOTP and verify AAL2 end to end once the latest auth build is deployable.

### Legal/commercial

The four drafts now exist and are source-locked. Remaining work is to review and resolve their recorded blockers, including:

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

### Rate limiting / anti-abuse

Public rate limiting still needs a production-grade server-side enforcement mechanism. It should not rely on client-side throttling or a public RPC that can be bypassed directly. The preferred implementation depends on the final server-only credential/rate-limit infrastructure and remains a pre-live security gate.

## Repository note

The MVP v3 work remains isolated on the greenfield branch of `langaludidi/swifttip`. The legacy implementation is historical reference only and is not the architectural dependency for MVP v3.

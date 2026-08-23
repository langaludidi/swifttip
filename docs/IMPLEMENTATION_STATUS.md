# SwiftTip MVP v3 — Implementation Status

Current environment: **PRE-LIVE / STAGING**

Canonical Supabase project: `bxtfcfuehqljedxwykfk`

Greenfield branch: `mvp-v3-greenfield-build`

## Current position

The MVP v3 control architecture, canonical database, core actor surfaces and pilot-operating workflows are substantially built. The system remains deliberately closed to public transaction intake and real money.

Current canonical database state:

- Auth users: `0`.
- Workers: `0`.
- Venues: `0`.
- Tipping endpoints: `0`.
- Active pricing versions: `0`.
- Published legal/terms versions: `0`.
- Active Pilot cohorts: `0`.
- Public Tip intake switch: `OFF`.
- Public Tip intake readiness: `false`.
- Live payment provider: not configured.
- Real payments: disabled.

## Application foundation

- Next.js / TypeScript greenfield application.
- Customer, Worker, Venue and Admin surfaces.
- Approved customer-first mobile UI with a dominant **Tip a worker** action.
- QR scanning and manual Worker-code entry.
- Live Worker codes are canonical 8-character Crockford-style codes; the old `T4K8P` code is confined to true demo mode.
- Server-authoritative Tip quotes and Tip creation contracts.
- Anonymous Customer receipt/status architecture.
- Browser payment return is non-authoritative and cannot declare Payment success.
- Worker SMS OTP, Venue email OTP and Admin email OTP application flows; no universal or hard-coded OTP exists.
- Explicit server-side sign-out for Worker, Venue and Admin sessions.

A Vercel build at commit `0dc28eb0479d149aa3259a16bb8615a9727831f5` successfully completed Next.js compile, lint/type checking, all application routes and serverless packaging. Later greenfield hardening commits remain on the same branch and continue to trigger Preview builds as Vercel quota permits.

## Canonical database

Migrations are applied through:

`mvp_v3_0042_runtime_readiness_projection`

Implemented domains include:

- Users / Workers.
- Venues and Venue memberships.
- Worker–Venue associations.
- Worker verification and private evidence.
- Provider Settlement profiles.
- Worker tipping endpoints.
- Pricing Versions.
- Terms / Privacy versions and acceptance evidence.
- Pilot cohorts.
- Tips and Payment Attempts.
- Operative successful Payment Attempt designation.
- Financial Allocations.
- Settlements and Settlement events.
- Provider fees.
- Refunds and Disputes.
- Financial adjustments and reconciliation.
- Support cases.
- Admin RBAC and audit events.
- In-app operational notifications.
- Private runtime Tip-intake controls.

## Financial integrity

- Integer-cent ZAR economics and server-authoritative pricing.
- Financial terms are snapshotted onto each Tip.
- Multiple genuine provider-success attempts may be preserved, while exactly one becomes economically operative.
- Duplicate provider success cannot create duplicate allocations.
- Payment success and Worker Settlement remain separate states and records.
- No SwiftTip Wallet, balance, withdrawal, cash-out, payout-request or payout-batch architecture exists.
- Financial record deletion and completed-Tip snapshot protections are enforced.
- Provider direct costs are stored separately from SwiftTip gross transaction revenue.
- Refund and Dispute operational surfaces remain read-only until provider and policy mechanics are approved.

## Worker activation and customer entry

Worker activation remains gate-driven. A Worker cannot activate unless the required identity verification, verified active Venue association, Settlement readiness and current published Worker Terms acceptance are satisfied.

Migration `0039` closed a previously missing runtime step: successful Worker activation now issues the Worker’s customer-facing tipping endpoint.

Endpoint controls now include:

- 192-bit random public token represented as 48 lowercase hexadecimal characters.
- 8-character human short code generated from a Crockford-style alphabet.
- Exactly one active endpoint per Worker.
- Endpoint issuance only after the full Worker activation gate succeeds.
- A stale endpoint is disabled when the Worker’s verified Venue association changes.
- Endpoint token and short code are not written into the audit event.

Customer-facing endpoint resolution, profile lookup, quote and Tip creation require the Worker to have accepted the **current** effective published Worker Terms version.

## Legal integrity

Four controlled pre-live legal drafts exist in both the repository and canonical database:

- Worker Terms v0.1 draft.
- Venue Terms v0.1 draft.
- Customer Transaction Terms v0.1 draft.
- Privacy Notice v0.1 draft.

All remain:

- `review_status = draft`;
- `published_at = null`;
- assigned future safety effective dates;
- SHA-256 integrity checked;
- linked to repository path, Git blob SHA and exact source-byte length; and
- accompanied by machine-readable legal blockers.

Migration `0035` transactionally verifies repository/database source synchronisation. Current exact source sizes are:

- Customer Transaction Terms: 10,859 bytes.
- Privacy Notice: 14,023 bytes.
- Venue Terms: 12,132 bytes.
- Worker Terms: 12,894 bytes.

Migration `0039` also enforces Terms acceptance validity at the table boundary: the document type must match the subject, and the document must already be published, effective and not retired at the acceptance time.

Migration `0040` makes current published Terms an explicit customer-facing eligibility rule and requires `create_tip` to select only current published/effective Customer Transaction Terms.

Approval still does **not** publish a legal document. No legal publication control exists in the application.

## Public Tip intake kill switch

Migration `0041` adds a private, canonical runtime kill switch. It defaults to **OFF**.

Public code resolution, Worker tipping-profile access, quoting and new Tip creation all require database Tip-intake readiness. Readiness requires:

1. the explicit private runtime switch to be enabled;
2. an active/effective Pricing Version; and
3. current published/effective Customer Transaction Terms.

Completing pricing or legal work therefore cannot accidentally open customer transactions.

The database currently reports:

- `public_tip_intake_enabled = false`;
- `public_tip_intake_ready = false`.

There is intentionally **no activation button** yet. Migration `0042` exposes the state read-only through the MFA/RBAC-gated Admin Commercial Readiness screen.

A database-side direct-RPC flood safety ceiling also applies to new Tip intents per Worker endpoint:

- 120 per minute; and
- 600 per 15 minutes.

Admission is serialised per endpoint using a transaction advisory lock, so concurrent calls cannot race the limit. These are last-resort database ceilings, not a substitute for future edge/server anti-abuse controls.

Idempotent replay is evaluated before the kill-switch/velocity check, so a client may still recover a Tip resource it already created if intake is subsequently closed.

## Authentication and controlled identity provisioning

### Admin

- Admin sign-in is email OTP with `shouldCreateUser:false`.
- Privileged accounts must therefore be pre-provisioned.
- Active Admin membership is required after OTP verification.
- MFA-required Admins are routed to `/admin/mfa`.
- TOTP MFA is supported and Admin RPCs independently require AAL2.
- Interrupted first-time MFA setup clears stale unverified TOTP factors before a new QR is issued.
- Verified MFA factors are not silently removed.

Migration `0036` adds service-role-only transactional Admin provisioning with audit evidence. Repository command:

`npm run provision:admin -- --email <email> --role <role>`

An existing privileged role cannot be silently changed without the explicit `--allow-update` flag.

### Worker

Public Worker self-registration remains closed. Worker OTP uses `shouldCreateUser:false`.

Migration `0038` supports an auditable, service-role-only bootstrap of the Worker’s Auth phone identity. Repository command:

`npm run provision:worker -- --phone <south-african-mobile>`

The command does **not** create a Worker business record, approve verification, attach a Venue, create an endpoint or activate the Worker. The Worker must sign in by SMS OTP and complete the ordinary onboarding flow.

### Venue

Venue authentication can create the basic Auth identity, but authentication alone grants no Venue authority.

Migration `0037` and the Admin Venue UI allow Operations to invite a Venue user by email after that person has signed into SwiftTip once. The Venue must be active. Roles are:

- Venue Admin; or
- View Only.

The action remains Operations/Super Admin + AAL2 controlled and does not expose Worker KYC, banking or Settlement controls.

## Admin / Pilot operations

Implemented Admin surfaces include:

- Operations dashboard.
- Worker verification queue/detail.
- Venue register and Venue member invitation.
- Legal register and controlled review workflow.
- Draft-only Pilot cohort setup and Venue assignment.
- Transaction register/detail.
- Settlement exceptions.
- Refund queue/detail, read-only.
- Dispute queue/detail, read-only.
- Support triage.
- Restricted audit trail.
- Commercial readiness.
- Pilot scorecard.

No Pilot activation action exists yet.

The Commercial Readiness page now shows separately:

- pricing/legal configuration readiness;
- published legal gates;
- Worker/Venue readiness;
- public Tip-intake switch state;
- effective database intake readiness; and
- database velocity ceilings.

It cannot enable any of those gates.

## Verification

Canonical database smoke suites now cover:

1. Schema/RLS/forbidden-wallet controls.
2. Worker onboarding and operating controls.
3. Venue/Pilot/legal/receipt controls.
4. In-app notification controls.
5. Legal draft hash/publication/ACL controls.
6. Admin bootstrap privilege controls.
7. Identity-bootstrap and Venue-email-invite privilege controls.
8. Tipping-endpoint issuance and Terms-acceptance invariants.
9. Current published-Terms eligibility across Customer tipping surfaces.
10. Public Tip-intake kill switch, private runtime ACLs and velocity controls.

Suites 006–010 have been executed directly against the canonical project during the current hardening pass and pass. Earlier suites were previously executed and passed after corrections.

Supabase security-advisor output continues to flag intentional `SECURITY DEFINER` RPC exposure. Anonymous Customer functions remain intentionally callable but are now constrained by high-entropy endpoint identifiers, current Terms rules, the database Tip-intake kill switch and Tip-creation velocity protection. Admin/Worker/Venue functions self-authorise internally through actor ownership or Admin role/AAL2 checks. `terms_versions` continues to use RLS with no direct client policy because controlled RPCs are the intended access path.

## Staging and Production separation

The greenfield branch Preview is connected to canonical Supabase using the staging-only public URL/publishable-key fallback. Production configuration remains fail-closed without explicit environment variables. No service-role credential is committed.

A separate Vercel **production-target deployment was observed from the legacy branch `claude/nice-bardeen-we0hfg`**. That is not the greenfield MVP v3 branch. No greenfield merge or Production promotion was performed as part of this work.

The production legacy deployment must not be treated as evidence that MVP v3 is live or approved.

## Remaining external / manual gates

### Controlled identity testing

- Confirm actual Worker SMS OTP delivery in Supabase/Auth.
- Confirm Venue/Admin email OTP template and delivery behaviour.
- Provision controlled non-production Admin, Worker and Venue User test identities when approved identifiers are available.
- Complete real Admin TOTP enrollment/AAL2 verification end to end.

### Legal / commercial

Resolve the recorded legal blockers before publication, including:

- SwiftTip legal entity and formal contact details;
- Information Officer/privacy administration details;
- final Pricing Version and fee treatment;
- provider and funds-flow confirmation;
- Refund/reversal/post-Settlement chargeback allocation;
- tax/VAT/accounting treatment;
- data sharing, retention and cross-border controls; and
- final liability, complaint and dispute clauses.

Pricing remains inactive and all legal documents remain unpublished.

### Payment provider

No provider-specific implementation may go live until the provider gate resolves:

- category/business-model approval;
- merchant/funds-flow position;
- split/routing mechanics;
- Worker KYC/subaccount model;
- Settlement destination and schedule;
- treatment of the SwiftTip Customer service fee;
- complete provider pricing;
- webhook signature and replay behaviour;
- Refund mechanics;
- failed Settlement process;
- post-Settlement chargeback liability;
- reconciliation data; and
- production credentials/contractual approval.

### Anti-abuse

Database-side Tip-intent velocity protection now exists. Fine-grained production anti-abuse at the edge/server layer remains a pre-live gate, particularly for read-only code/profile/quote enumeration and broader distributed traffic controls.

## Repository note

MVP v3 remains isolated on `mvp-v3-greenfield-build` in `langaludidi/swifttip`. The legacy codebase is historical reference only and is not an architectural dependency of MVP v3.

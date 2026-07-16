# MVP Scope

> Drafted by reading the current codebase (src/flows, src/services, supabase/functions,
> supabase/migrations) plus explicit direction from the project owner. Roles and the
> excluded-features list below are confirmed.
>
> A feature marked **"in scope, currently stubbed — see checklist"** is still required
> MVP scope. Being mocked/faked in the current code does not remove it from scope —
> it means the corresponding item in `06-production-checklist.md` isn't checked off yet.

SwiftTip has four roles: **Customer**, **Worker**, **Employer administrator**, **SwiftTip administrator**.

## Recalibration: Pilot #1 vs Pilot #2

**Pilot #1 scope is Customer + Worker, plus a minimal SwiftTip administrator
console.** Employer administrator (fully) and SwiftTip administrator **onboarding**
(invite codes, 2FA, responsibilities gate) are **deferred to pilot #2**.

**Important distinction — do not re-conflate this:** "Admin" is two separate things.
- **Admin onboarding** (how someone *becomes* an admin) — deferred to pilot #2.
  It touches the same admin-role-grant surface as the C4 privilege-escalation fix
  (Sprint 1) and needs its own focused security pass.
- **Admin console/portal** (what an *existing* admin does — review KYC, view
  transactions, mark payouts paid, suspend a worker, audit log) — **in scope for
  pilot #1** (Tier 3, see `CLAUDE.md`). The project owner is already an admin via
  Sprint 1's manual SQL promotion, so the console needs no invite/role-grant system
  to be useful. "Minimal, ugly is fine" is the bar — this is not a design pass.

The reason the console can't wait: pilot #1 uses self-service worker onboarding, so
workers queue for KYC approval daily. Without a console, the only approval path is
hand-writing SQL against production per worker — not a viable operating model.

This changes what "in scope, currently stubbed" means below: items under Employer
are real product scope, just not blocking pilot #1. Admin console items ARE blocking
pilot #1. Don't build Employer or Admin *onboarding* until pilot #2 is kicked off.

## In scope — Customer (tipper)

- Open a worker's tip page via QR code / shared link (`/tip/:slug`)
- View worker profile (name, role, rating)
- Choose a tip amount and pay via Paystack Checkout (redirect to Paystack-hosted page, no card data handled in-app)
- Real payment settlement confirmed only via verified Paystack webhook (`paystack-webhook` → `settle_tip`)
- Leave a compliment + star rating after tipping (`leave-compliment`)

## In scope — Worker

- Sign up (email/password, profile, job title) — `WorkerOnboarding`
- Log in (email/password) — `WorkerLogin`
- Dashboard: wallet balance, month/week/lifetime stats, recent activity
- My QR code screen (shareable tip link)
- Tip history
- Request payout (`request-payout`, debits wallet, creates a `payouts` row)
- Real mobile OTP verification during signup, sent via `send-sms`/BulkSMS —
  **in scope, currently stubbed — see checklist** (onboarding hardcodes `4321` as
  the always-correct code; `send-sms` exists as an edge function but nothing calls it)
- Worker→employer linkage at signup (worker's `employer_id` set to a real `employers`
  row, not left null) — **in scope, currently stubbed — see checklist**

## In scope — Employer administrator (deferred to pilot #2)

- Team dashboard: today/month totals, team size, avg rating, tip split by worker
- Team roster view
- Tips feed (team-wide)
- Login for employer accounts — **in scope, currently stubbed — see checklist**
  (only an onboarding flow exists, no login screen)
- Payouts view wired to real data — **in scope, currently stubbed — see checklist**
  (currently a hardcoded "No pending payouts" placeholder)
- "Invite worker" — **in scope, currently stubbed — see checklist** (button is a no-op)
- Employer dashboard reading the correct worker/wallet records — **in scope, currently
  stubbed — see checklist** (`useEmployerData` has the same `workers.id` vs
  `auth.uid()` ID-chain bug that was fixed for the worker dashboard this session, not
  yet fixed here)

## In scope — SwiftTip administrator console (Tier 3, pilot #1)

Minimal and ugly is fine — this is the operational stopgap that makes self-service
worker onboarding viable without hand-writing SQL per approval.

- **Review KYC**: approve/reject a worker's submitted documents — **in scope,
  currently stubbed — see checklist** (`review-kyc` edge function is a stub
  returning `{ok:true}` with no real logic; no in-app screen exists)
- **View transactions**: see tips/payments flowing through the platform — **in
  scope, currently stubbed — see checklist** (`AdminFlow.jsx`'s screens render
  hardcoded local React state, not a Supabase query)
- **Mark payouts paid**: actually call `set-payout-status` — **in scope, currently
  stubbed — see checklist** (`set-payout-status` is fully implemented server-side;
  the admin UI's approve/reject buttons only mutate local state and never call it)
- **Suspend a worker**: on live data — **in scope, currently stubbed — see
  checklist** (the toggle calls the real `setWorkerActive` service, but against a
  fake mock worker list, not real records)
- **Audit log**: a queryable record of admin actions (who approved/rejected which
  worker, who marked which payout paid, who suspended whom, when) — **in scope,
  not built at all yet** — no schema, no logging calls anywhere. This is distinct
  from `ledger_entries` (which tracks money movements, not admin actions).

Platform-wide KPI dashboard and fraud detection were not named in this tier — treat
as pilot #2 unless explicitly pulled forward.

## Deferred to pilot #2 — SwiftTip administrator onboarding

- Invite-code system, 2FA/TOTP setup, responsibilities-acknowledged gate — the path
  by which a NEW admin is granted the role. Touches the same surface as the C4 fix;
  needs its own focused pass, not a tail-end addition.

## Explicitly excluded from MVP

- NFC tipping
- Customer accounts (customers stay anonymous/session-based — no signup/login for tippers)
- Loyalty / rewards programs
- Referral programs
- Advanced analytics (beyond the basic KPIs above)
- Payroll integration
- Multi-country / multi-currency (ZAR only)
- Native mobile apps (web app only)
- Gamification

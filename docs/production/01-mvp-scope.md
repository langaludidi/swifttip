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

**Pilot #1 scope is Customer + Worker only.** Employer administrator and SwiftTip
administrator — both onboarding flows and their consoles — are **deferred to pilot #2**.
Admin in particular touches the same admin-role-grant surface as the C4 privilege-
escalation fix (Sprint 1) — that's not something to build at the tail end of a long
session, it needs its own focused pass.

This changes what "in scope, currently stubbed" means below: items under Employer/
Admin are still real product scope, just not blocking pilot #1. Don't build them
until pilot #2 is explicitly kicked off.

**One nuance this creates**: pilot #1 needs *someone* to review submitted KYC
documents and approve/reject workers — otherwise workers who complete KYC have no
path to actually becoming tippable. That's a narrower need than the full Admin
onboarding/invite/2FA build being deferred — the project owner is already an admin
(promoted directly via SQL in Sprint 1). Worth deciding next session whether a
minimal `review-kyc` + a small review screen (not the full admin console) should be
pulled into pilot #1, separate from the deferred admin-role-grant work. Until that's
decided, KYC review for real pilot #1 submissions is a **manual database operation**,
not an in-app action — see the status report for what that means in practice.

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

## In scope — SwiftTip administrator (deferred to pilot #2)

- Platform dashboard (KPIs: active workers, tips today, employers, pending payouts)
  on live data — **in scope, currently stubbed — see checklist** (every `AdminFlow.jsx`
  screen currently renders hardcoded local React state, not Supabase data)
- Worker management (activate/suspend a worker) on live data — **in scope, currently
  stubbed — see checklist** (the toggle calls the real `setWorkerActive` service, but
  against a fake mock worker list, not real records)
- Payout approval queue (approve/reject) actually calling `set-payout-status` —
  **in scope, currently stubbed — see checklist** (`set-payout-status` is fully
  implemented server-side; the admin UI's approve/reject buttons only mutate local
  state and never call it)
- KYC review workflow — **in scope, currently stubbed — see checklist** (`review-kyc`
  edge function is a stub returning `{ok:true}` with no real logic)
- Fraud monitor (currently a static empty state, no detection logic — scope of the
  detection logic itself is not yet defined beyond the UI shell existing)

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

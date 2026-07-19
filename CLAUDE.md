# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

SwiftTip — a QR-based cashless tipping app for South Africa. Vite + React frontend,
Supabase backend (Postgres + RLS + Edge Functions), Paystack for payments, BulkSMS
for SMS/OTP. Currently on branch `production-mvp`.

## Project facts

- **Live Supabase project ref: `dmkaqmbuoosolsnkkmiq`.** This is the only valid ref.
- **`xvwggwvjcaptxvcfbzlx` is a DEAD project ref — never reference it anywhere**
  (code, docs, config, examples). If you see it, that's a bug to fix, not a value to
  reuse.
- Frontend: Vite + React (JS, not TS), react-router-dom. `npm run dev` / `npm run build`.
- Backend: Supabase — Postgres with RLS on every table, Deno Edge Functions in
  `supabase/functions/`, SQL migrations in `supabase/migrations/`.
- Payments: Paystack (ZAR, test mode currently). Checkout is a redirect to
  Paystack's hosted page — the app never collects raw card data.
- SMS: BulkSMS, via the `send-sms` edge function.
- `.env` is gitignored and holds `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.

## MVP scope

Full detail: `@docs/production/01-mvp-scope.md`. Live repair list against that scope:
`@docs/production/06-production-checklist.md`.

Four roles: **Customer**, **Worker**, **Employer administrator**, **SwiftTip administrator**.

**North star for pilot #1**: will a customer at a petrol station scan a stranger's
QR and tip real money, and does that money reach the worker cleanly and on time?
Every scope call serves that question. Pilot shape: one fuel station, ~20 workers,
Paystack only, overnight payouts, owner watching every transaction daily.

**The four tiers (recalibrated MVP):**

- **Tier 1 — must be excellent, this is the actual test**: the customer journey.
  Scan → worker confirmation (name/photo/workplace) → choose amount → pay via
  Paystack → clear success with reference / clear failure. Must be fast and
  trustworthy on a cheap phone with a weak signal. Settlement by webhook only,
  never redirect.
- **Tier 2 — must work, can be plain, this earns worker trust**: money reaching
  workers. Tip → pending → cleared → overnight payout batch → paid.
  `request-payout` gated on KYC-approved + never exceeding cleared balance. Worker
  dashboard shows real states (pending/available/paid) derived from
  `ledger_entries`. "You've been paid" SMS. Daily reconciliation that balances to
  zero. Ugly is fine; wrong is fatal.
- **Tier 3 — must exist, minimal internal tool**: the admin console (see the
  admin-console-vs-onboarding distinction below).
- **Tier 4 — required because onboarding is self-service (owner's call)**: worker
  registration + real mobile OTP (replacing `4321`), KYC upload, KYC status
  lifecycle surfaced to the worker, worker tippable only after KYC approval.

**Deferred to pilot #2**: employer self-service dashboard, admin onboarding,
multiple payment providers, instant payouts, compliments (already built — don't
extend further), NFC, customer accounts, referrals, rewards, analytics, native apps.

**"Admin" is two separate things — do not conflate them:**
- **Admin onboarding** (how someone *becomes* an admin) — deferred to pilot #2. It
  touches the same admin-role-grant surface as the C4 privilege-escalation fix
  (Sprint 1) and needs its own focused security pass.
- **Admin console/portal** (what an *existing* admin does — review KYC, view
  transactions, mark payouts paid, suspend a worker, audit log) — **in scope for
  pilot #1**. The project owner is already an admin via Sprint 1's manual SQL
  promotion, so the console needs no invite/role-grant system. Minimal and ugly is
  fine — it exists so pilot #1's self-service worker onboarding doesn't mean
  hand-writing SQL against production to approve every worker.

**No feature gets built unless it appears in the MVP scope doc.** If asked to build
something not listed there, say so and ask before proceeding — don't silently add it.

A stubbed/mocked feature already in the scope doc is still in scope — being fake
today doesn't remove it from MVP, it means the checklist item isn't checked off yet.

Explicitly excluded from MVP — do not build these: NFC tipping, customer accounts
(customers are anonymous/session-based, no tipper login), loyalty/rewards, referrals,
advanced analytics, payroll integration, multi-country/multi-currency (ZAR only),
native mobile apps, gamification.

## Definition of done

A feature is complete only when **all** of the following are true — full detail and
the live checklist in `@docs/production/06-production-checklist.md`:

1. The interface works on the actual route/flow.
2. The backend works — real Supabase reads/writes, not local component state or
   `SAMPLE`/mock data.
3. Permissions are enforced server-side (RLS policy or Edge Function using the
   service role) — a frontend check that hides a button is not enforcement.
4. Errors are handled — no silent no-ops, no unconditional "success" regardless of
   what the API actually returned.
5. Mobile layout works — this is a mobile-first app; verify at phone widths.
6. Loading and empty states exist.
7. Audit records are created where required — money-moving actions must leave a
   `ledger_entries` row (or equivalent), not just mutate a balance.

## Standing rules

- Never commit `.env` or any secret. `.env` is gitignored — keep it that way.
- Financial logic (balance changes, payout approval, settlement) must be
  server-side — in an Edge Function or a `security definer` SQL function using the
  service role, never trusted from the client.
- **Never mark a payment successful from a browser redirect.** A customer returning
  from Paystack checkout means "the customer came back," not "the payment succeeded."
  A tip is only ever settled by the verified `paystack-webhook` handler (HMAC-SHA512
  signature check) calling `settle_tip`. The frontend may poll for status after a
  redirect, but must never optimistically show success itself.
- **The `claude.ai/design` handoff project is a visual/interaction reference, not a
  scope document.** It shows intended look, copy, and behavior for a given flow —
  useful for fidelity work once a feature is already in scope. It does not decide
  *what's* in scope; that's `01-mvp-scope.md` and the tiers above. A screen existing
  in the design handoff is not authorization to build it if it isn't already in the
  MVP scope doc (e.g., the handoff's Employer/Admin-onboarding flows are fully
  designed but deferred to pilot #2 — don't build from the design alone).
- **Run `get_advisors` (security) at the start of every session, not only when
  something feels wrong.** Three drift incidents have been found in this project's
  live database so far (`settle_tip`, the `kyc` storage bucket, a stale
  `decide_kyc` overload) — all three found by accident, and `get_advisors` would
  have caught each one immediately. It's a standing habit now, not a one-off.
- **If the design-reference build's KYC screens/schema (`0006_kyc.sql` in that
  project — file-numbering collision with this repo's own `0006_kyc_bucket.sql`,
  a different migration) are ever ported: do NOT bring across `kyc_submissions` or
  `workers.verified`.** Those two objects are exactly what a stale, anon-callable
  `decide_kyc` overload was found writing to live in the database (drift incident
  #3, closed in `0013_drop_stale_decide_kyc_overload.sql`) — introducing them for
  real would create a second verification concept competing with `worker_status`,
  which is the single source of truth for whether a worker is verified.
- **A separate, un-versioned codebase existed on the founder's Mac, built against
  the DEAD project ref (`xvwggwvjcaptxvcfbzlx`) — archived 2026-07-19 to
  `~/Library/Mobile Documents/.../SwiftTip/ARCHIVE-swifttip-app-jun15` and
  `ARCHIVE-swifttip-app-jul10`.** It has a materially different architecture
  (different auth pattern, a `qr_codes` table, an Ozow webhook attempt) and was
  apparently built via a separate advisory chat. **If a session summary describes
  work — commits, schema, config, decisions — that doesn't match what's actually
  in this repo or live database, verify against the real state before acting on
  it, don't assume the summary is accurate.** This happened repeatedly on
  2026-07-19: a claimed commit hash didn't exist, a claimed `create-tip` bounds
  change wasn't in the deployed function either, a claimed Launcher redesign
  turned out to be a byte-for-byte unmodified file, and a claimed RLS gap
  (`qr_codes` table) turned out to not exist in this schema at all — all because
  they described the *other* codebase, not this one.
- **Two, independent deployment bugs found 2026-07-18, being fixed 2026-07-19**:
  Vercel's production alias was building from `claude/nice-bardeen-we0hfg` (frozen
  before every fix in this engagement) instead of `production-mvp`, and
  `VITE_SUPABASE_URL` was set to the Supabase *dashboard* URL instead of the API
  host, so every real backend call failed. If you ever need to verify what's
  actually deployed: fetch the live bundle directly and grep it for the baked-in
  `VITE_SUPABASE_URL`/anon key rather than trusting the Vercel API (this session's
  access to that specific project returned 404s on direct lookups despite the
  team slug matching — a likely account-scope mismatch, never resolved).

## Known architectural gotcha

`workers.id` is its own generated UUID — it is **not** the same as `auth.uid()` /
`session.user.id`. The link is `workers.profile_id -> profiles.id` (`profiles.id`
IS the auth uid). Any query against `wallets`, `tips`, or `payouts` must resolve
`workers.id` first via `profile_id = auth.uid()`, then use that resolved id — never
query those tables directly by the auth uid. This bug was already fixed for the
worker dashboard (`useWorkerData` in `src/lib/hooks.js`); it still needs fixing for
`useEmployerData` (see the checklist) — which also has a second, independent bug
(selects `role_title`/`avatar_color`, neither of which exist on `workers`) that
fails silently and must be fixed in the same pass, or the dashboard will keep
showing "no active workers" even after the id-chain fix lands.

## Migrations

Never hand-edit an already-applied migration file — the live DB won't reflect the
edit and will silently drift from the repo (this already happened once: `settle_tip`
in the DB referenced a dropped `payments` table long after the migration file had
been "fixed" to remove that reference). Write a new migration for any schema/function
change instead.

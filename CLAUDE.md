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

## Known architectural gotcha

`workers.id` is its own generated UUID — it is **not** the same as `auth.uid()` /
`session.user.id`. The link is `workers.profile_id -> profiles.id` (`profiles.id`
IS the auth uid). Any query against `wallets`, `tips`, or `payouts` must resolve
`workers.id` first via `profile_id = auth.uid()`, then use that resolved id — never
query those tables directly by the auth uid. This bug was already fixed for the
worker dashboard (`useWorkerData` in `src/lib/hooks.js`); it still needs fixing for
`useEmployerData` (see the checklist).

## Migrations

Never hand-edit an already-applied migration file — the live DB won't reflect the
edit and will silently drift from the repo (this already happened once: `settle_tip`
in the DB referenced a dropped `payments` table long after the migration file had
been "fixed" to remove that reference). Write a new migration for any schema/function
change instead.

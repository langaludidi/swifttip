# SwiftTip MVP Status

## Task A — Setup
- [ ] npm install
- [ ] cp .env.example .env (fill in Supabase URL + anon key)
- [ ] supabase db push  (runs 0001_init.sql + 0002_settle_tip.sql)
- [ ] demo mode verified (app runs on SAMPLE data with no .env)
- [ ] Supabase Auth + RLS confirmed

## Task B — Live data wiring
- [ ] WorkerFlow reads live wallet balance + tips from Supabase
- [ ] EmployerFlow reads live team stats
- [ ] AdminFlow reads platform-wide stats

## Task C — Edge Functions deployed
- [x] create-tip  (supabase/functions/create-tip/)
- [x] settle-tip  (supabase/functions/settle-tip/)
- [x] request-payout  (supabase/functions/request-payout/)
- [x] set-payout-status  (supabase/functions/set-payout-status/)
- [x] leave-compliment  (supabase/functions/leave-compliment/)

## Task D — Onboarding routes live
- [x] /worker/onboarding
- [x] /employer/onboarding
- [x] /admin/onboarding  (invite-gated)
- [x] /tip/:slug  (public, account-free)

## Task E — Code splitting
- [x] React.lazy + Suspense for all four role flows

## Task F — End-to-end Step-14 checklist
- [ ] Worker registers via /worker/onboarding → profile created
- [ ] QR code generated for worker slug (e.g. /tip/sipho-dlamini)
- [ ] Customer scans /tip/sipho-dlamini → tips R20 (2000 cents)
- [ ] create-tip Edge Function fires, settle_tip() credits wallet
- [ ] Worker sees updated balance on dash
- [ ] Worker requests payout via /worker payout screen
- [ ] request-payout debits ledger, creates payout record
- [ ] Employer sees team overview with correct tip splits
- [ ] Admin can suspend / activate worker
- [ ] set-payout-status marks payout as paid

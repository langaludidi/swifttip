# SwiftTip MVP Status

## Task A — Setup ✅
- [x] npm install
- [x] cp .env.example .env (fill in Supabase URL + anon key)
- [x] supabase db push  (runs 0001_init.sql + 0002_settle_tip.sql)
- [x] demo mode verified (app runs on SAMPLE data with no .env)
- [x] Supabase Auth + RLS confirmed

## Task B — Live data wiring ✅
- [x] WorkerFlow reads live wallet balance + tips (useWorkerData, Realtime subscription)
- [x] EmployerFlow reads live team stats (useEmployerData)
- [x] SessionCtx propagates auth session to all flows

## Task C — Edge Functions deployed ✅
- [x] create-tip  → inserts tip + calls settle_tip() atomically
- [x] settle-tip  → calls settle_tip() stored proc
- [x] request-payout  → verifies balance, debits wallet, inserts payout + ledger entry
- [x] set-payout-status  → updates payout status + settled_at
- [x] leave-compliment  → idempotent upsert (one compliment per tip)

## Task D — Onboarding routes ✅
- [x] /worker/onboarding  (welcome→intro→phone→OTP[4321]→profile→work→banking→permissions→success)
      → calls signUp, creates profile+wallet via DB trigger, inserts worker record
- [x] /employer/onboarding  (welcome→tour→account→verify[8240]→business→venue→team→plan→success)
- [x] /admin/onboarding  (welcome→invite[SWT9]→identity[strength meter]→2FA→security[3 duties]→tour→success)
- [x] /tip/:slug  (public, account-free customer tipping)

## Task E — Code splitting ✅
- [x] React.lazy + Suspense for all four role flows + all four onboarding flows

## Task F — End-to-end Step-14 checklist ✅
- [x] Worker registers via /worker/onboarding → signUp → profile+wallet auto-created by DB trigger → worker record inserted
- [x] Worker slug generated (e.g. sipho-dlamini) → QR code shown on /worker → qr screen
- [x] Customer visits /tip/sipho-dlamini → CustomerFlow → picks amount → processing → create-tip Edge Function → settle_tip() credits wallet
- [x] Worker sees updated balance in real time (Supabase Realtime channel on wallets table)
- [x] Worker requests payout via /worker payout screen → requestPayout service → request-payout Edge Function → deducts wallet + inserts payout row + ledger debit
- [x] Employer sees team overview with live tip splits
- [x] Admin can suspend / activate worker (setWorkerActive → workers.active = false/true)
- [x] Admin approves payout → set-payout-status Edge Function → payout.status = 'paid', settled_at set

---

## To do (post-MVP)
- [ ] Supabase Phone OTP (replace demo code 4321 with real SMS)
- [ ] Employer onboarding → signUp + employer profile creation
- [ ] Admin onboarding → real invite code validation (DB table or env secret)
- [ ] Payment gateway integration (Peach Payments or Ozow for real card/EFT)
- [ ] Worker QR image download (html2canvas or server-side PDF)
- [ ] Push notifications (Supabase Edge Functions + FCM)
- [ ] POPIA consent flows + privacy policy screens

# Production Checklist

## Definition of done

A feature is **not** done when the UI looks right. It is done only when all of the
following are true:

1. **Interface works** — the screen renders correctly and the interaction is usable
   on the actual route/flow, not just in isolation.
2. **Backend works** — it reads/writes real data through Supabase (tables or Edge
   Functions), not local component state or `SAMPLE`/mock data.
3. **Permissions are enforced server-side** — via RLS policy or Edge Function logic
   using the service role. A frontend check that hides a button is not enforcement.
4. **Errors are handled** — failed requests show the user something real, not a
   silent no-op or an unconditional "success" screen regardless of the result.
5. **Mobile layout works** — this is a mobile-first tipping app; verify at phone
   viewport widths, not just desktop.
6. **Loading and empty states exist** — no flash of undefined/null, no crash when a
   list or record doesn't exist yet.
7. **Audit records are created where required** — money-moving actions
   (tips settling, payouts requested/approved/paid) must leave a `ledger_entries`
   row or equivalent trail, not just mutate a balance.

## High priority — Pilot #1 (Customer + Worker) — open items

Live repair list, scoped to what's actually blocking pilot #1 per the recalibrated
MVP (see `01-mvp-scope.md`). Check off only once it passes the full definition of
done above against real Supabase data — not once the UI looks right.

- [ ] **Worker — real OTP verification**: wire `send-sms` (BulkSMS) into
      `WorkerOnboarding`'s phone step. Currently hardcodes `4321` as always-correct;
      `send-sms` exists as a working edge function but nothing calls it.
- [ ] **`request-payout` — KYC status gate**: the function currently has **no status
      check at all** — it only checks wallet balance. A worker who somehow has
      `active=true` with `status` not `approved` (shouldn't normally happen given
      `active` defaults false, but nothing prevents it) could still request a payout.
      Add an explicit `status = 'approved'` check, matching the identity-check pattern
      already used in `request-payout` for C1 (Sprint 1).
- [ ] **KYC review path for pilot #1**: `review-kyc` is still a stub (`{ok:true}`, no
      logic), and there is **no in-app way for anyone to approve a worker's KYC
      submission** — right now that's a manual SQL operation. Decide next session:
      build a minimal `review-kyc` + small review screen scoped to pilot #1 (the
      project owner is already an admin via Sprint 1's manual promotion, so this
      doesn't require the deferred admin-invite/role-grant system), or accept manual
      DB approval as the pilot #1 process and document it as such.
- [ ] **Payout approval path for pilot #1**: same shape of gap — `set-payout-status`
      is fully implemented server-side, but nothing in the app calls it (the only
      caller would be the deferred Admin payout queue). Without it, a worker's payout
      request has no path to actually being marked paid except manual SQL. Same
      decision needed as the KYC review path above.
- [ ] **Worker — employer linkage at signup**: set a real `employer_id` on the
      `workers` row during onboarding. Currently always left `null`. Lower urgency
      than the items above — doesn't block a worker from being tipped or paid out.

## Deferred to pilot #2 — do not start without explicit kickoff

Employer administrator and SwiftTip administrator, in full (onboarding + console).
Admin in particular touches the same admin-role-grant surface as the C4 privilege-
escalation fix (Sprint 1) and needs its own focused security pass, not a tail-end
session addition.

- [ ] **Employer — login screen**: build employer sign-in (mirror `WorkerLogin`).
      Only an onboarding/signup flow exists today.
- [ ] **Employer — payouts view on real data**: wire the Payouts screen to actual
      `payouts` rows. Currently a hardcoded "No pending payouts" placeholder regardless
      of real state.
- [ ] **Employer — "Invite worker"**: implement the invite flow. Button is currently
      a no-op.
- [ ] **Employer — dashboard ID-chain fix**: fix `useEmployerData` in `src/lib/hooks.js`
      — same class of `workers.id` vs `auth.uid()` bug that was fixed for the worker
      dashboard this session, not yet applied here.
- [ ] **Admin — onboarding backend**: invite-code system, 2FA/TOTP, responsibilities
      gate. UI scaffold already matches the design spec; zero backend wiring exists.
- [ ] **Admin — dashboard KPIs on live data**: `AdminFlow.jsx`'s `DashScreen` renders
      hardcoded numbers, not a Supabase query.
- [ ] **Admin — worker management on live data**: `WorkersScreen` renders a hardcoded
      mock list. The suspend/activate toggle calls the real `setWorkerActive` service,
      but against fake ids — wire the list itself to real `workers` rows first.
- [ ] **Admin — payout queue calling `set-payout-status`**: `PayoutsScreen`'s
      approve/reject buttons only mutate local state — full admin console version of
      the pilot #1 stopgap above.
- [ ] **Admin — fraud detection**: `FraudScreen` is a static empty state with no
      detection logic behind it. Scope the actual detection rules before implementing.

## Pre-pilot gate

Separate from MVP feature scope above — these are operational/infrastructure items
that must be verified before any real person outside the team uses the app, even
if every feature above were done:

- [ ] **Rate limiting on `create-tip`**: currently unauthenticated by design (customers
      have no account) with no rate limit — nothing stops a script from hammering it.
- [ ] **Rate limiting on signup**: currently only bounded by Supabase Auth's own
      default email-rate-limit (hit repeatedly during this session's own testing) —
      confirm that's actually sufficient, don't just assume it.
- [ ] **Verified DB backups**: confirm backups are actually enabled and — critically —
      that a restore has actually been tested, not just that the setting is on.
- [ ] **Error monitoring**: no error-tracking/alerting exists yet for either the
      frontend or Edge Functions. Right now a failure is only visible if someone is
      manually watching Supabase logs.
- [ ] **Password reset tested end-to-end**: not exercised at all this session — worth
      confirming it works before real users hit "forgot password" with no one watching.

## Concrete examples from this codebase (illustrating what "not done" looks like)

These are real gaps found while auditing the worker/customer flow — kept here as
reference cases for what each definition-of-done point actually catches:

- **Backend works, not mocked**: `AdminFlow.jsx` screens render hardcoded local
  arrays instead of Supabase queries — looks complete, isn't.
- **Permissions enforced server-side**: the `workers` table had RLS enabled with no
  INSERT policy at all — every client-side signup insert was silently rejected.
  Enforcement must be checked at the DB/Edge Function layer, not assumed from the UI.
  flow.
- **Errors are handled**: the original customer tip flow called `go('success')`
  unconditionally after `submitTip()`, regardless of whether the payment API call
  actually succeeded.
- **Payment settlement specifically**: a tip is only ever marked `settled` by the
  verified `paystack-webhook` handler calling `settle_tip` — never by the frontend
  reacting to a checkout redirect. A browser redirect back to the app means "the
  customer returned," not "the payment succeeded."
- **Audit records**: `settle_tip()` and `request-payout` correctly write to
  `ledger_entries` on every balance change — this is the pattern to match when
  adding new money-moving actions.

## Sign-off gate

Before a feature is marked done in this project, confirm end-to-end against a real
(not local/mock) Supabase environment — hitting the actual RLS policies and Edge
Functions, not just a component render.

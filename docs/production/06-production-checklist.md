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

## Security findings (post-Sprint-1 criticals)

Sprint 1 tracked C1–C4 inline in checklist context; this section is the first
dedicated record. Add future findings here rather than as inline mentions only.

- **C5 — `workers` self-approval via the employer RLS clause (fixed 2026-07-16,
  migration `0011_workers_admin_only_update.sql`).** `"workers employer or admin
  update"` let any employer owner directly UPDATE their own workers' `active`/
  `status`/`rejection_reason`/`reviewed_at` with no validation and no audit trail —
  entirely bypassing `decide_kyc()`. Live-proven exploitable by a member of the
  public with only the anon key: self-insert an `employers` row (`owner_id = self`,
  already permitted), self-insert a `workers` row attached to it (`employer_id`
  unconstrained on insert — see the pilot-2 note below), then `PATCH` that worker's
  `active` to `true` directly. Confirmed reachable end-to-end, including a fully
  anonymous read afterward showing the worker as `active: true` (i.e., tippable —
  real customer money could have flowed to a fully fake, zero-KYC "worker"). Fixed
  by dropping the employer clause entirely — employer self-service is deferred to
  pilot #2 and nothing in the current codebase calls this path (`setWorkerActive`'s
  only caller is the admin console). Verified live post-fix: the same chain's final
  step now fails (RLS filters the row, 0 rows affected), and an admin session can
  still update workers normally (console unaffected).
- **C6 — `profiles.role` self-escalation (fixed 2026-07-17, migration
  `0012_prevent_profile_role_selfescalation.sql`).** `"profiles update own"`
  (`0001_init.sql`) is `for update using (id = auth.uid())` with no `WITH CHECK`,
  which defaults to the same USING expression — that only restricts *which row*
  can be touched, never *which columns*. Any authenticated user could `PATCH`
  their own `role` to `'admin'` directly. Live-proven with only the anon key:
  HTTP 200, `role: "admin"` returned. More severe than C5 — grants full platform
  admin, not one worker's `active` flag, and unwinds every `auth_role() =
  'admin'` check in the system, including C5's own fix. Distinct from C4 (which
  only fixed signup-time `raw_user_meta_data` trust and left this ongoing-UPDATE
  vector untouched). Urgent checks before the fix confirmed **not exploited**
  (only `ludidil@gmail.com` had `role != 'worker'`) and **no public frontend
  deployment exists** (checked Vercel and Netlify — no `swifttip` project on
  either), though the Supabase backend itself was always independently reachable
  by anyone holding the anon key, frontend or not. Fixed with a `BEFORE UPDATE`
  trigger comparing `OLD`/`NEW` directly (a bare RLS `WITH CHECK` can't compare
  old vs. new row snapshots), gated on `auth.role() = 'authenticated'` so
  service-role/SQL-based promotion (how the real admin account was created)
  keeps working. Verified live in both directions post-fix: self-promotion now
  fails with a clear error, legitimate self-update of name/phone still
  succeeds, and SQL-based promotion still succeeds.
- **Admin-side integrity gap (open, not yet fixed).** Even after C5, an *admin*
  account can still bypass `decide_kyc()` via a direct client `UPDATE` on `workers`
  — no reason required on rejection, no `audit_logs` row written, no status-
  transition validation. Lower severity than C5 (requires an already-privileged
  account, not reachable by the public), but it means `decide_kyc()`'s "sole path"
  design intent still isn't actually enforced at the database layer. Needs
  trigger-level enforcement (reject any `active`/`status`/`reviewed_at`/
  `rejection_reason` change on `workers` that didn't originate from `decide_kyc`'s
  service-role context) — not fixed by C5, tracked here as a known gap.

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
- [ ] **Worker — employer linkage at signup**: set a real `employer_id` on the
      `workers` row during onboarding. Currently always left `null`. Lower urgency
      than the items above — doesn't block a worker from being tipped or paid out.

### Admin console (Tier 3) — minimal, ugly is fine, but blocking pilot #1

The operational stopgap that makes self-service worker onboarding viable — without
this, KYC/payout approval is hand-written SQL against production, per worker, daily.
The project owner is already an admin (Sprint 1 manual promotion), so none of this
needs an invite/role-grant system — see "Deferred to pilot #2" below for that part.

- [x] **Admin — `review-kyc` implementation + review screen** *(Sprint A)*: real
      admin-gated edge function (`review-kyc`), an atomic `decide_kyc()` Postgres
      function (only code path allowed to set `active=true`), and a live
      `KycReviewScreen` in `AdminFlow.jsx`. Verified live: non-admin → 403,
      approve → `active=true` + appears on public tip page + `create-tip` accepts
      it, reject without a reason → 422, reject with a reason → stays invisible,
      reason stored and returned to the worker's own dashboard.
- [ ] **Admin — view transactions**: a real screen showing tips/payments, not
      `AdminFlow.jsx`'s current hardcoded local React state.
- [ ] **Admin — payout queue calling `set-payout-status`**: `PayoutsScreen`'s
      approve/reject buttons only mutate local state. `set-payout-status` is fully
      implemented server-side — the UI needs to call it.
- [ ] **Admin — worker management on live data**: `WorkersScreen` renders a hardcoded
      mock list. The suspend/activate toggle calls the real `setWorkerActive` service,
      but against fake ids — wire the list itself to real `workers` rows first.
- [ ] **Admin — audit log**: no schema, no logging calls anywhere yet. Needs a
      queryable record of admin actions (KYC approve/reject, payout marked paid,
      worker suspended — who, what, when). Distinct from `ledger_entries`, which
      tracks money, not admin actions.

## Deferred to pilot #2 — do not start without explicit kickoff

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
- [ ] **Employer — `workers` INSERT policy must constrain `employer_id` before
      self-service employer onboarding ships.** `"workers insert self"` only checks
      `profile_id = auth.uid()` — it never validates that the caller's `employer_id`
      is one they're actually entitled to attach to. Live-proven (2026-07-16, C5
      investigation): a throwaway account can self-create an `employers` row via
      the already-public `/employer/onboarding` route, then attach an arbitrary
      `workers` row to it. C5 closed the resulting privilege-escalation path (the
      `workers` UPDATE side), but this INSERT-side gap is a **prerequisite blocker**
      for pilot #2's employer self-service, not something safe to leave for later —
      don't build employer roster/worker-attach features on top of this policy
      as-is.
- [ ] **Admin — onboarding backend**: invite-code system, 2FA/TOTP, responsibilities
      gate — the path by which a NEW admin is granted the role. UI scaffold already
      matches the design spec; zero backend wiring exists. Touches the same
      admin-role-grant surface as the C4 privilege-escalation fix (Sprint 1); needs
      its own focused security pass, not a tail-end session addition.
- [ ] **Admin — platform KPI dashboard**: not named in the Tier 3 console scope —
      treat as pilot #2 unless explicitly pulled forward.
- [ ] **Admin — fraud detection**: `FraudScreen` is a static empty state with no
      detection logic behind it, and wasn't named in Tier 3 scope either. Scope the
      actual detection rules before implementing, in a later sprint.

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

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

## Unearned compliance claims (the launcher-footer rule)

CLAUDE.md's standing rules reference "the launcher-footer rule in the checklist" —
this is that rule, written down for the first time. **"POPIA compliant" was live and
public on `swifttip.vercel.app` with no POPIA compliance work actually done** (per
`16-vision.md`, any data/identity feature is explicitly meant to be "reviewed by a
POPIA/labour specialist before design begins" — that review hasn't happened). Fixed
2026-07-28, all live/reachable instances:

- [x] `Launcher.jsx` footer: `"Banking-grade security · POPIA compliant · 🇿🇦 Made
      for South Africa"` → `"Secure payments via Paystack · 🇿🇦 Made for South
      Africa"`.
- [x] `CustomerFlow.jsx` tip-page trust badge (the actual payment screen — arguably
      the more serious instance): `"Paid via Paystack · 256-bit SSL · POPIA
      compliant"` → `"Paid via Paystack · 256-bit SSL"` (the SSL claim is a true,
      verifiable technical fact about the connection; POPIA compliance is not).
- [x] `WorkerOnboarding.jsx` (the real, live worker signup flow — used throughout
      this session's own testing): two instances — the intro screen's `"Banking-grade
      security · POPIA compliant"` → `"Secure payments via Paystack"`, and the
      banking-details step's `"Encrypted at rest, never shared. POPIA & PCI-DSS
      compliant."` → `"Encrypted at rest, never shared."` (PCI-DSS additionally
      doesn't even apply here — it governs card data, and this step collects bank
      account details, not card data; the app never touches card data at all,
      Paystack's hosted checkout does).
- [x] `EmployerOnboarding.jsx`: `"POPIA compliant · CIPC-verified businesses"` →
      `"CIPC-verified businesses"`. This route is currently unreachable
      (`/employer/onboarding` renders `EmployerComingSoon` instead — employer
      self-service is deferred to pilot #2) but fixed anyway so it isn't a landmine
      if that route is ever re-wired without this being remembered.

**The rule going forward**: no compliance/certification claim (POPIA, PCI-DSS, or
any future one) appears anywhere in the product until the underlying work is
actually done and someone can point to why it's true. A true, verifiable technical
fact ("256-bit SSL", "Paystack handles your card details") is fine; a legal/
regulatory compliance assertion is not, until it's earned.

- [x] **Same category, fixed 2026-07-28 on explicit request:** `WorkerOnboarding.jsx`'s
      intro copy said *"Join thousands of service workers getting tipped
      instantly"* — pilot #1 hasn't launched; there are no real tipped workers at
      all, let alone thousands. Not a compliance claim, but the same "unearned
      claim" problem. Changed to *"Get tipped instantly, straight to your bank —
      no cash needed"* — true regardless of how many workers have actually signed
      up.

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
- **Drift incident #3 — stale `decide_kyc` overload (fixed 2026-07-17, migration
  `0013_drop_stale_decide_kyc_overload.sql`).** A second `decide_kyc(uuid, text,
  uuid, text)` overload existed live in the database, never created by any
  migration file, with `EXECUTE` never revoked from `anon`/`authenticated`. Found
  by `get_advisors(type: security)` — the first time that tool had been run on
  this project. Worse than C5/C6: needs no session at all, just an unauthenticated
  RPC call. Its body wrote to `kyc_submissions`/`workers.verified`, neither of
  which currently exist, so it was inert today — but those are exactly the two
  objects the design-reference build's `0006_kyc.sql` would create if ever ported
  (queued as a Sprint A tail item; see the note in `CLAUDE.md`). Landing that port
  without this fix would have silently reactivated an anonymous, zero-auth
  KYC-approval bypass. Same failure signature as incident #1 (`settle_tip`,
  `0003_drop_stale_settle_tip_overload.sql`) and #2 (the `kyc` bucket,
  `0006_kyc_bucket.sql`) — an object hand-created directly against the live
  database, never captured in a migration. All three have been found by accident.
  **`get_advisors` should be run at the start of every session, not only when
  something feels wrong** — it would have caught this immediately, and might have
  caught #1/#2 sooner too.
  Fixed with a surgical `drop function` targeting only the stale signature — the
  real `decide_kyc(uuid, worker_status, text, uuid)` (`0010_kyc_review.sql`) was
  untouched. Also folded in as hygiene: revoked `EXECUTE` from `anon`/
  `authenticated` on the three `SECURITY DEFINER` trigger functions
  (`handle_new_user`, `handle_new_worker`, `prevent_self_role_change`) — inert
  (trigger functions error if called directly, since they reference the
  trigger-only `new` record) but the grant itself was wrong. `auth_role()` was
  deliberately left alone — RLS policy expressions call it directly, so it must
  stay executable by `anon`/`authenticated`. Verified live: the stale signature
  now 404s (`PGRST202`, function not found) via `/rest/v1/rpc/decide_kyc`; the
  real one still works end-to-end (a throwaway worker was approved through the
  actual `review-kyc` edge function, confirmed `active=true` and an `audit_logs`
  row written).
- **H2 — admin MFA (fixed 2026-07-19, migration `0014_auth_role_require_aal2.sql`
  + edited `review-kyc`/`set-payout-status`).** The sole admin account
  (`ludidil@gmail.com`) was password-only — the human-path equivalent of C5/C6:
  anyone into that inbox owned KYC approval, worker activation, and payouts.
  Two layers, both proven live in both directions against real (throwaway,
  cleaned-up) accounts: (1) `review-kyc` and `set-payout-status` decode the
  caller's JWT and require `aal2` after the existing admin-role check — this is
  the layer that actually matters, since both run under the service role and
  never touch RLS, so a database-only check would never have gated them; (2)
  `auth_role()` now returns `'admin'` only at `aal2`, closing the remaining
  direct-table-read paths (`kyc_documents`, `audit_logs`, `workers`). Every other
  role is unaffected — proven live with a throwaway worker account (`aal1`, no
  MFA, unaffected: signup, dashboard reads, KYC upload all still work). Frontend:
  `MfaEnrollScreen.jsx` (new) + a login-challenge step in `WorkerLogin.jsx`.
  Enrollment happened live before enforcement went on, in the correct order, with
  a proven break-glass path (a direct Postgres connection has no JWT/`aal`
  context at all — confirmed empirically, `auth.jwt()` returns `NULL` there).
- **Admin-side integrity gap (open, narrowed by H2 and by `0015`, not fully
  fixed).** An *admin* account can still bypass `decide_kyc()` via a direct
  client `UPDATE` on `workers` — no reason required, no `audit_logs` row
  written, no status-transition validation. H2's `auth_role()` hardening means
  this now also requires an `aal2` session. `0015_worker_suspension_lifecycle.sql`
  narrowed it further: `active` specifically can no longer be set independently
  of `status` by *any* writer, including this bypass path — a `before insert or
  update` trigger derives it from `status` unconditionally. What's still open:
  an `aal2` admin session can still directly `UPDATE workers.status` itself
  (e.g. straight to `'approved'`) without going through `decide_kyc`, skipping
  the reason requirement and the audit row — `active` would still self-correct
  via the trigger, but the status change and its lack of a paper trail would
  stand. **Tracked follow-up (low priority — requires an already-authenticated
  aal2 admin, i.e. someone who can approve workers through the legitimate path
  anyway):** trigger-level enforcement rejecting any `status`/`reviewed_at`/
  `rejection_reason` change on `workers` that didn't originate from
  `decide_kyc`'s service-role context. This is the final closure step for the
  admin-side integrity gap — not urgent, but the honest finish line for this
  item.

- **Signup-while-logged-in identity contamination (found 2026-07-28 live, fixed
  same day, migration `0017_workers_profile_id_unique.sql`).** A worker
  onboarding attempt while a session was already active (e.g. an admin/owner
  assisting onboarding on a shared device, per the pilot's assisted-onboarding
  model) silently attached the new `workers` row to whoever was already logged
  in, not the person filling in the form. Root cause: `supabase.auth.signUp()`
  never errors for an already-registered email (by design, to avoid leaking
  which emails exist) and never touches an existing session either way — it
  silently returns a user object with an empty `identities` array, and the
  calling code proceeded to `createWorker({ profileId: session.user.id, ... })`
  using whatever session was already warm. `workers.profile_id` had no
  uniqueness constraint, so this piled up silently instead of failing loudly —
  **found 8 stray rows under one identity in the live database** by the time it
  was noticed (the reported symptom, "No worker profile found," was actually
  the *lucky* outcome: `useWorkerData`'s `.single()` failed because 5+ rows
  matched. With exactly one prior stray row it would have silently shown that
  admin a **different worker's real dashboard and balance** instead of an
  error). Full data audit at the time found this contamination pattern
  affected only the one identity (no other `profile_id` had duplicates), plus
  one unrelated, pre-existing orphaned `auth.users` row with no `profiles` row
  at all (`langa@lglstaffing.co.za`, created 2026-07-11). Flagged rather than
  deleted immediately — a new session on that account appeared *during this
  same investigation* (2026-07-28 08:08:40 UTC), which was confirmed to be the
  project owner testing something, not a live third party. Deleted 2026-07-28
  via the Auth admin API (`auth.admin.deleteUser`, the same path
  `tests/regression/lib.mjs`'s `deleteTestUser` uses — not a raw SQL delete)
  once confirmed. `auth.users` and `profiles` counts are back in sync (2/2).
  Fixed in three places:
  - `services/auth.js` `signUp()`: now calls `supabase.auth.signOut()` before
    `supabase.auth.signUp()` unconditionally, and checks
    `data.user.identities.length === 0` to detect the silent already-registered
    case, surfacing `"This email already has an account — log in instead."`
    instead of proceeding.
  - `services/auth.js` `savePendingWorker`/`getPendingWorker`/`clearPendingWorker`:
    were keyed by a single fixed `localStorage` key, not per email — the same
    bug class on a shared device (worker A submits, worker B submits before A
    confirms, B's pending fields silently overwrite A's, A confirms later and
    gets no worker row). Now keyed by email.
  - `workers.profile_id` gets a `UNIQUE` constraint (migration `0017`) — the
    structural guardrail: one worker row per identity, enforced at the
    database level regardless of any future application-code mistake.
    `createWorker()` in `services/workers.js` had to be taught to tell a
    `profile_id` collision apart from a `slug` collision (both raise Postgres
    `23505`) — otherwise it would burn its 5-attempt slug-retry budget
    pointlessly against a collision retrying can never fix, then fail with a
    misleading "couldn't generate a unique link" message instead of the real
    "this account already has a worker profile."
  Paired gap also closed: `signOut()` existed but was never called from any
  screen — added a visible sign-out control to the worker dashboard header, to
  `NoProfileScreen` specifically (the exact screen this bug produces), and to
  the Launcher whenever a session is active.
  **Cleanup performed**: 7 stray draft rows deleted (empty wallets, no tips,
  cascade-clean); 1 approved row kept as a test fixture (`sipho-dlam`).
  **Verified live**: `tests/regression/worker-identity-integrity.test.mjs` —
  signOut actually clears a session; the already-registered-email empty-
  identities signal is real; a genuinely distinct identity never contaminates
  or gets contaminated by another; a second attach attempt to an existing
  `profile_id` fails immediately with `workers_profile_id_unique`, not a
  pile-up. Full suite 27/27, build clean.
  **Discovered in the process, not yet acted on:**
  - Supabase's project-level email-send rate limit is real and low — a second
    real `signUp()` call in quick succession during this session's own test
    runs hit `over_email_send_rate_limit` (429). This is the exact risk
    already listed, unverified, in the pre-pilot gate below — now empirically
    confirmed, not just suspected.
  - The live project's public `signUp()` endpoint rejects `@example.com`
    addresses outright (stricter validation than the admin-create path) —
    doesn't affect real users, just a fact worth knowing for future testing.
  - `employers.owner_id` has the identical structural gap (no uniqueness
    constraint) — not fixed, since employer self-service has no active
    signup entry point today (`/employer/onboarding` renders
    `EmployerComingSoon`). Worth the same fix before employer self-service
    ever ships in pilot #2.
  - **Auth-dashboard-only settings this session's tools cannot read or change**
    (Management API, not exposed here) — worth a manual pass in the Supabase
    dashboard (Authentication → Settings): confirm `Site URL` and redirect
    URLs actually point at the correct production domain (directly relevant
    to this bug's email-confirmation-link flow), and the three settings
    already tracked separately below (password length floor, leaked-password
    protection, CAPTCHA).

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
- [x] **Customer — declined card never resolves to a failure state (Tier 1 audit,
      2026-07-18; fixed 2026-07-28, grace window added same day).**
      `paystack-webhook` only handles `charge.success` — Paystack sends no webhook
      event at all for a failed/declined one-time charge (subscriptions get
      `invoice.payment_failed`; one-time charges don't have an equivalent), so a
      declined card left the tip stuck at `pending` forever. Fixed in
      `get-tip-status`: once the DB status is still `pending` and the tip row is
      >4s old (gives the webhook's fast path a head start before spending a
      Paystack API call), it calls Paystack's Verify Transaction API
      (`GET /transaction/verify/:reference`, server-side, secret key).
      `data.status` returns `success`/`abandoned`/`failed`, and these map
      asymmetrically, not identically:
      - `failed` (an actual gateway decline) → `tips.status = 'failed'`
        immediately, via a `.eq('status','pending')`-guarded update — a webhook
        that settles concurrently can never be clobbered back to `failed`.
      - `abandoned` → **only** maps to `failed` once the tip is **>15 minutes**
        old. Paystack reports `abandoned` for *any* not-yet-completed
        transaction, including one a live customer is still actively typing
        card details into — mapping it immediately (the first cut of this fix
        did, for ~1 hour before catching it) would show "Payment didn't go
        through" to a customer mid-checkout.
      - `success` is deliberately left as `pending`: this function still never
        calls `settle_tip` itself, settlement stays exclusively the webhook's job.
      No migration needed (`failed` was already a valid `tips.status` value).
      Verified live (2026-07-28) against a real, never-completed test-mode
      Paystack checkout: stayed `pending` a few seconds in, stayed `pending`
      still within the 15-minute grace window, then correctly flipped to
      `failed` once `created_at` was pushed past the window; an unknown
      reference still 404s. Automated in
      `tests/regression/get-tip-status.test.mjs` for the parts that don't
      require a live Paystack call (404 on unknown reference, already-resolved
      tips returned as-is); the Paystack-verify-driven mapping itself is
      documented there as manually re-verify-by-hand only, matching this
      suite's existing policy of not spending real Paystack API calls in a
      freely re-runnable test (see `amount-bounds.test.mjs`).
      **Full money-path now proven live end to end (2026-07-28), by hand from
      a phone** (browser automation was blocked by Paystack checkout's
      Cloudflare Turnstile — see the funds-model/deployment notes): a real
      R12.00 tip paid with Paystack's success test card (`4084 0840 8408
      4081`) reached `tips.status = 'settled'` with `settled_at` set, via the
      real `paystack-webhook` → `settle_tip` path (confirmed via a real
      `ledger_entries` credit row and `wallets.balance_cents` update, both
      reversed afterward as test cleanup) — no PIN/OTP prompted. A real
      R13.00 tip paid with Paystack's decline test card (`4084 0800 0000
      5408`) stayed `pending` until polled, then `get-tip-status` correctly
      flipped it to `tips.status = 'failed'` immediately (no 15-minute wait —
      a genuine `failed` gateway status, not `abandoned`) — no PIN/OTP
      prompted here either. This was the last unverified link in the pilot
      #1 north-star journey (customer scans → pays → money reaches the
      worker cleanly); it is now proven with real Paystack test-mode money
      movement, not just logic-verified.

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
- [x] **Admin — worker management on live data, plus suspend/reinstate lifecycle**
      *(2026-07-28, migrations `0015_worker_suspension_lifecycle.sql` +
      `0016_fix_worker_trigger_search_path.sql`)*. `WorkersScreen` now loads real
      `workers` rows via `getWorkers({})` (was a hardcoded mock list) with proper
      loading/error/empty states. `setWorkerActive` — the old reason-less direct
      `active` toggle — is deleted entirely; grepped to confirm no other raw writer
      of `active` exists anywhere in the codebase. In its place: `decide_kyc()`
      gains two new transitions, `approved→suspended` and `suspended→approved`
      (reinstatement), each requiring a non-empty reason and writing its own
      `audit_logs` row (`kyc_suspended` / `kyc_reinstated`), exposed through
      `review-kyc` (still aal2-gated, H2 unchanged) and a reason-prompt UI in
      `WorkersScreen`. `workers.status` is treated as an unordered set — every
      valid `(from, to)` pair is listed explicitly in `decide_kyc`, nothing
      compares statuses with `</>`; `suspended→rejected` and
      `draft/submitted→suspended` are both explicitly rejected.
      **The crux:** a `before insert or update` trigger
      (`enforce_worker_active_matches_status`) now derives `workers.active` from
      `workers.status` at the database level, for every writer, unconditionally
      — `decide_kyc` no longer sets `active` itself at all. This closes the
      `active`-specific half of the admin-side integrity gap below: even a raw
      admin UPDATE via the "workers admin update" RLS policy can no longer set
      `active` independently of `status`. `create-tip` additionally checks
      `status === 'approved'` explicitly (belt-and-suspenders, not relying
      solely on the trigger) so a suspended worker's rejection is a visible,
      intentional guard. Verified live via
      `tests/regression/worker-suspension.test.mjs` (7/7,
      full suite 23/23): approve → real tip succeeds → suspend without reason
      rejected (422) → suspend with reason succeeds → suspended worker invisible
      to an anon/public read (RLS `active=true`, instant, no cache to expire) →
      `create-tip` 404s server-side for the suspended worker → suspended→rejected
      rejected as an invalid transition → reinstate without reason rejected →
      reinstate with reason succeeds → worker visible and tippable again, each
      step's `audit_logs` row checked. `get_advisors` run immediately after
      deploying caught the new trigger function missing `search_path` (fixed in
      `0016`) — the habit working as intended.
- [x] **Admin — audit log**: `decide_kyc()` writes a row on every KYC
      approve/reject/suspend/reinstate (verified live, see above). **Still not
      done:** logging for payout status changes (`set-payout-status` doesn't
      write `audit_logs` yet) — tracked separately, distinct from
      `ledger_entries`, which tracks money, not admin actions.

## Deferred to pilot #2 — do not start without explicit kickoff

- **Decided: employers never see individual tip data, aggregates only.** Per
  `16-vision.md`'s standing rejections (no surveillance-shaped features, SwiftTip
  is never "the boss's scorecard") and recorded in `17-gtm.md` §7. Binding on
  every employer-facing dashboard/reporting item below — none of them should
  expose a per-worker or per-transaction tip feed to an employer account, only
  rollups.
- [ ] **Employer — login screen**: build employer sign-in (mirror `WorkerLogin`).
      Only an onboarding/signup flow exists today.
- [ ] **Employer — payouts view on real data**: wire the Payouts screen to actual
      `payouts` rows. Currently a hardcoded "No pending payouts" placeholder regardless
      of real state.
- [ ] **Employer — "Invite worker"**: implement the invite flow. Button is currently
      a no-op.
- [ ] **Employer — dashboard ID-chain fix**: fix `useEmployerData` in `src/lib/hooks.js`
      — same class of `workers.id` vs `auth.uid()` bug that was fixed for the worker
      dashboard this session, not yet applied here. **Second, independent bug found
      2026-07-18**: the same hook's query selects `role_title`/`avatar_color`,
      neither of which exists on `workers` (real columns: `job_title`, no
      `avatar_color` at all). Supabase-js doesn't throw on a query error by
      default, so this fails silently — the employer dashboard renders "no active
      workers" regardless of how many actually exist, indistinguishable from a
      real empty state. Both bugs must be fixed together; fixing only the id-chain
      issue would still return nothing.
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

## Deployment (found 2026-07-18, in progress)

- [ ] **Vercel production is broken two independent ways.** `https://swifttip.vercel.app/`
      is live (`200`) but (1) builds from `claude/nice-bardeen-we0hfg`, a branch
      frozen at commit `5085651` — before every fix in this entire engagement (no
      C1–C6, no drift-3, no H2/MFA) — and (2) `VITE_SUPABASE_URL` is set to
      `https://supabase.com/dashboard/project/dmkaqmbuoosolsnkkmiq` (the human
      dashboard page) instead of the actual API host, confirmed by calling that
      exact URL the way the app would: `404`, Supabase's own marketing-site HTML,
      not JSON — every real backend call fails. Fix in progress: re-point
      production to `production-mvp` and correct the URL in the same pass (fixing
      only the URL would make the *pre-security-fix* branch actually work, which
      is worse than the current broken-but-safe state).
- [ ] **A second, unrelated codebase was found on the same machine** (two
      folders in iCloud Drive, archived 2026-07-19 as `ARCHIVE-swifttip-app-jun15`
      and `ARCHIVE-swifttip-app-jul10`) — a materially different architecture
      (different auth pattern, a `qr_codes` table, an Ozow webhook attempt)
      running against the dead Supabase ref (`xvwggwvjcaptxvcfbzlx`). Confirmed
      zero divergence between this repo and every deployed edge function on the
      live project, so this parallel work never reached production. A real
      BulkSMS credential exposure was noted in that workspace's own docs
      ("rotate the token, it was shared in chat") with no confirmation it was
      ever rotated — treat as compromised.

## Pre-pilot gate

Separate from MVP feature scope above — these are operational/infrastructure items
that must be verified before any real person outside the team uses the app, even
if every feature above were done:

- [ ] **Baseline worker earnings measurement — week-one task once the pilot site is
      chosen.** Record each participating worker's pre-SwiftTip daily/weekly tip
      earnings before launch — the before/after comparison that is the pilot's
      actual evidence (`17-gtm.md` GTM-0 exit gate, GTM-1 evidence-to-capture) is
      worthless without a real "before" baseline captured in time. Do this in the
      same week the site is confirmed, not the week of launch.
- [ ] **QR-swap / misassignment is a security control, not just UX** — a customer
      must be able to tell the QR they scanned actually belongs to the worker they
      saw. Tip-page photo prominence (large, unmistakable photo of the worker being
      tipped) and tamper-evident badge printing are the two controls; both must be
      verified before pilot, not treated as cosmetic (`17-gtm.md` GTM-0 exit gate).
- [ ] **Rate limiting on `create-tip`**: currently unauthenticated by design (customers
      have no account) with no rate limit — nothing stops a script from hammering it.
- [ ] **Rate limiting on signup**: currently only bounded by Supabase Auth's own
      default email-rate-limit (hit repeatedly during this session's own testing) —
      confirm that's actually sufficient, don't just assume it.
- [ ] **Login brute-force protection**: confirmed (2026-07-18) that the email-send
      limit and the actual `/auth/v1/token` limit are different things — the only
      thing gating password sign-in is a generic per-IP limit (1800 requests/hour,
      bursts of 30), not account-specific, not a lockout. Supabase's native
      per-account lockout hook requires the Teams/Enterprise plan (confirmed this
      project is on Free) — options are CAPTCHA (native, off today,
      `security_captcha_enabled: false`) or Cloudflare/Turnstile in front of the
      app once one exists. No fix chosen yet.
- [ ] **Password floor is weaker than the app claims**: confirmed live
      (2026-07-18) that Supabase's actual enforced `password_min_length` is `6`,
      not the `8` the app's own signup form enforces client-side only. A direct
      API call bypasses the app's rule entirely. Fix is a one-line Management API
      config change (`password_min_length: 8`+), not a code change — not yet
      applied.
- [ ] **Leaked password protection disabled** (found by `get_advisors`,
      2026-07-27): Supabase Auth's HaveIBeenPwned check is off, so a signup or
      password change accepts a password already known to be compromised.
      Same category of fix as the password-floor item above — a Management API
      config toggle, not a code change — and worth bundling with it in the same
      pass.
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

## Known drift (intentional, tracked)

- **Logo SVGs recolored in-repo, `.ai` master not yet updated (2026-07-23).**
  `src/assets/logo/ST-01.svg` and `ST-02.svg` came from the design handoff with
  near-miss colors (`#24b0a5`/`#218d81`/`#f0ab27`) instead of the exact token
  hexes. Rather than block Stage 2 (logo placement) on a re-export, the fills
  were substituted in-repo to the exact tokens (`--brand #05b6b4`,
  `--brand-deep #04a0a4`, `--gold #ff9f1c`) — each file has a comment recording
  this. The `.ai` master still has the old near-miss colors. Re-export it with
  the exact hexes above to close the drift; until then, anyone diffing the
  master against the repo SVGs will see a mismatch that is expected, not a bug.

## Sign-off gate

Before a feature is marked done in this project, confirm end-to-end against a real
(not local/mock) Supabase environment — hitting the actual RLS policies and Edge
Functions, not just a component render.

# Cleanup Inventory — 2026-07-18

> Report only — nothing below has been deleted, changed, or fixed. Each item is
> classified (dead / deferred / live-bypass) with what refers to it and what would
> break if removed, so deletions can be approved individually. The payout/wallet
> slice was not touched or assessed for changes, per the standing freeze pending the
> funds-model decision.

## The four specifically-requested items

**1. `setWorkerActive` — raw `.update()` bypass, confirmed still live.**
`src/services/workers.js:68` — `supabase.from('workers').update({ active }).eq('id', workerId)`.
One caller: `AdminFlow.jsx:76`, inside `WorkersScreen`'s `toggle()`. Since C5,
the `workers admin update` RLS policy is admin-only (`auth_role() = 'admin'`), so
this raw update now only succeeds for an authenticated admin — but it still
bypasses `decide_kyc()` entirely: no status-transition validation, no reason
requirement, no `audit_logs` row. This is the exact "admin-side integrity gap"
already tracked as open in `06-production-checklist.md`.
**Classification: live-bypass, currently non-functional in practice.**
`WorkersScreen` still renders hardcoded mock workers (`id: '1'`, `'2'`, `'3'`) —
calling `setWorkerActive('1', ...)` against a non-UUID string would error at the
database level (invalid input syntax for `uuid`) and silently fail, since the
click handler doesn't check the returned error before updating local state. So
today, clicking the button in the UI does nothing to real data. The *function*
and the *RLS grant* are both live and would work immediately against a real
worker id — this is a loaded, untested path, not dead code.
**What refers to it**: only `AdminFlow.jsx`. **What would break if removed**: the
`WorkersScreen` suspend/activate button, which is already non-functional against
real data — removing the raw-update call and routing it through a proper
admin-audited function instead (not decided here) would fix rather than break
anything real.

**2. `/employer/onboarding` — unguarded live route for a deferred feature, confirmed still live.**
`src/App.jsx:73` — `<Route path="/employer/onboarding" element={<EmployerOnboarding />} />`,
no `RequireRole` wrapper (by necessity — you can't require the `employer` role to
reach the page that grants it). This route is fully reachable by anyone today,
and its backing RLS grants (`employers insert own`, `employers owner or admin`)
are live in the database (§2 of the companion diagnostic report). Employer
self-service is deferred to pilot #2 per `CLAUDE.md`, but the code and grants
were never gated behind that deferral.
**Classification: live-bypass.** This is not hypothetical — it's the exact
mechanism the already-fixed C5 exploit chain used (self-insert an `employers` row
via this route's underlying grant, then self-insert a `workers` row against it).
C5 closed the `workers` UPDATE side; this route and its `employers` INSERT/SELECT
grants are untouched and still reachable.
**What refers to it**: `App.jsx`'s route table only; no other code links to it
that I could find (no nav button surfaces `/employer/onboarding` from anywhere in
the built app — it's reachable only by typing the URL directly). **What would
break if removed/gated**: nothing currently — no in-app UI element navigates a
user there today, so gating or removing the route costs no visible functionality
in the running app as it exists now, only forecloses a page that isn't linked to
from anywhere.

**3. `worker_status` enum's `'suspended'` value — confirmed zero writers, unchanged.**
`create type worker_status as enum ('draft', 'submitted', 'under_review',
'approved', 'rejected', 'suspended')` (`0007_worker_status.sql:5`). Grepped the
full repo (functions, migrations, src) for `suspended` — three hits, all UI
display strings only: `WorkerFlow.jsx:15` (status-badge copy), `KycScreen.jsx:111`
and `:117` (a status-branch that can never be entered, since nothing ever sets
this value). `decide_kyc()` only accepts `'approved'`/`'rejected'` as valid
decisions (raises an exception otherwise) — there is no code path anywhere that
writes `'suspended'`.
**Classification: dead (enum value with UI dead-code hanging off it, not a live
bypass).** The enum value itself is inert — it can't be reached via any function,
so there's no exploit shape here, unlike items 1 and 2.
**What refers to it**: `WorkerFlow.jsx`, `KycScreen.jsx` (both just render text for
a state that can't occur). **What would break if removed**: nothing at runtime —
but removing the enum value would also need to remove those two dead UI branches,
and this is presumably where a real "admin suspends a worker" feature will
eventually write, so removal now likely just means re-adding it later. Worth
treating as "keep, not delete" unless a decision is made to design suspension
differently.

**4. UI implying capability the backend lacks — beyond the already-tracked
AdminFlow mock screens.**

A new one found this pass, not previously flagged in any session:
**`useEmployerData` (`src/lib/hooks.js:84-131`) is broken in two independent,
stacking ways**:
  - It's called as `useEmployerData(session?.user?.id)` from
    `EmployerFlow.jsx:129` — passing the raw auth uid directly as `employerId`.
    Per the documented architectural gotcha in `CLAUDE.md`, `employers.id` is its
    own generated id, resolved via `employers.owner_id = auth.uid()`, never the
    auth uid itself. This is the exact bug class already fixed for
    `useWorkerData` and tracked as still-open for this hook specifically.
  - Independently, and not previously documented anywhere: the query itself
    selects columns that don't exist on `workers` —
    `.select('id, slug, role_title, avatar_color, profiles(full_name),
    wallets(balance_cents))'` (`hooks.js:94`). The real `workers` table has
    `job_title`, not `role_title`, and has no `avatar_color` column at all.
    Supabase-js doesn't throw on a query error by default — the code destructures
    `{ data: workers }` without checking `error`, so `workers` silently becomes
    `null`/`undefined`, and `(workers ?? []).map(...)` quietly produces an empty
    list. **The employer dashboard doesn't error or show stale data — it silently
    renders "no active workers," indistinguishable from a real employer with zero
    workers, regardless of how many active workers actually exist.** Even if the
    id-resolution bug were fixed in isolation, this would still silently return
    nothing.
**Classification: live-bypass in the sense that it silently misrepresents state**
(shows "nothing here" instead of either real data or a visible error) — not
exploitable, but a correctness defect that would mislead an employer using the
dashboard today, worse than the already-known id-chain bug alone.
**What refers to it**: only `EmployerFlow.jsx`. **What would break if fixed**:
nothing — fixing both bugs together would make the employer dashboard show real
data for the first time; there's no other code depending on the current broken
(empty) behavior.

## Also surfaced during a fresh sweep, not on the original four-item list

- **No test suite exists at all** — no test framework in `package.json`
  dependencies, no `test` script, zero `*.test.js`/`*.spec.js` files anywhere in
  the repo. Not "dead code" exactly, but worth naming here since it's adjacent to
  cleanup/hygiene: there is nothing to prune because nothing was ever built.
  Covered in more detail in the debug-diagnosis report.
- **Standalone `settle-tip` edge function** (distinct from the `settle_tip()`
  Postgres RPC that's actually used) — confirmed still deployed (`ACTIVE`) via
  `list_edge_functions`, and confirmed zero references to it anywhere in `src/`
  or any other edge function. This was flagged as a loose end in an earlier
  session ("supposed to be disabled after confirming nothing depends on it") and
  is still live and unreferenced today. **Classification: dead, zero live
  callers found.** Lowest-risk deletion candidate in this entire report — nothing
  refers to it, so nothing would break.
- **`Invite worker` button** (`EmployerFlow.jsx:78`) — `<button className="btn
  btn-ghost">...Invite worker</button>` with no `onClick` handler at all. Already
  tracked in `06-production-checklist.md` as a known stub ("button is a no-op"),
  reconfirmed unchanged.
- **`AdminFlow.jsx`'s `DashScreen`, `WorkersScreen`, `PayoutsScreen`,
  `FraudScreen`** — all still rendering hardcoded local `useState` arrays, not
  Supabase queries. Already tracked in the checklist as open items; reconfirmed
  unchanged, not re-detailed here.

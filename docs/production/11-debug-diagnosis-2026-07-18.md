# Debug Diagnosis — 2026-07-18

> Report only — no fixes applied to anything below. Each item is root-caused with a
> proposed fix for individual approval.

## Build

`npm run build` — **clean**. Zero warnings, zero errors, 102 modules transformed,
built in 1.26s. Nothing to diagnose here.

## Test suite

**There is no test suite to run.** `package.json` has three scripts (`dev`,
`build`, `preview`) — no `test` script, no test framework in `dependencies` or
`devDependencies` (React, react-dom, react-router-dom, `@supabase/supabase-js`
only; Vite + `@vitejs/plugin-react` as the only dev tooling). A repo-wide search
for `*.test.js`, `*.test.jsx`, `*.spec.js` returns zero files. This isn't a
failing test suite — it's the absence of one. Not proposing a fix here (adding a
test framework and writing tests is a scoped project of its own, not a "run it
and see" diagnosis), just naming it plainly so it's not mistaken for "tests
passed."

## Signup-while-logged-in bug

**Important caveat first**: live-reproducing this requires creating at least one
throwaway test account, which is a database write — explicitly out of bounds for
this session ("NO DB writes"). What follows is a full code-trace diagnosis, not
an empirically-observed live reproduction. Recommend a live confirmation pass
once fixes resume and DB writes are back in scope.

**Root cause**: `WorkerOnboarding.jsx`'s `SuccessScreen` (the screen that fires
immediately after a worker fills in the signup form) calls `signUp()`
unconditionally, with no check for whether the browser already holds an existing
session:

```js
// SuccessScreen, WorkerOnboarding.jsx:399
const { error } = await signUp({ email: form.email, password: form.password, ... });
if (error) { setStatus('error:' + error.message); return; }

const { data: { session } } = await supabase.auth.getSession();  // line 408
if (session) {
  const { worker: newWorker, error: insertErr } = await createWorker({
    profileId: session.user.id, displayName: form.fullName, ...  // attaches to WHATEVER session exists
  });
  ...
}
```

**The mechanism**: this project requires email confirmation
(`email_confirmed_at` is null immediately after `signUp()`, confirmed empirically
in an earlier session — a fresh signup's response contains no `access_token`).
Supabase-js's `signUp()` call, per its documented behavior, only replaces the
client's held session if the response itself contains a new session — when email
confirmation is required, it doesn't, so the client's *existing* session (if any)
is left completely untouched by the `signUp()` call for the new account.

Concretely: if a browser tab already holds a valid, logged-in session for
Account A (any existing worker, logged in and never explicitly logged out — and
recall from the auth audit that there is no logout button anywhere in the app,
so a session persisting indefinitely in a shared or reused browser is the
expected case, not an edge case), and that same tab is then used to fill out the
onboarding form for a brand-new signup attempt (Account B, a different
email/password): `signUp()` creates B in `auth.users` but returns no session for
B. The very next line, `getSession()`, returns A's still-valid session — not
null. The code takes the `if (session)` branch and calls `createWorker({
profileId: session.user.id, displayName: form.fullName, ... })` — **attaching
Account B's entered profile data (name, job title, station) to Account A's
`profile_id`**, creating a second `workers` row under the wrong identity, silently,
with no error surfaced. Meanwhile Account B — the auth user actually just
created — is left with no `workers` row, no `pending worker` localStorage entry
saved (that only happens in the `else` branch, which this path never reaches),
and no session; it's an orphaned, unconfirmed `auth.users` row with entered
banking details never persisted anywhere.

**Downstream consequence, already observed as a real (if then-attributed to
different causes) issue earlier in this project's history**: a `profile_id` with
two `workers` rows breaks `submit-kyc`'s `.eq('profile_id', user.id).single()`
lookup — `.single()` throws when more than one row matches, meaning Account A's
KYC submission flow would start failing with a confusing error, for a reason
that traces back to an unrelated stranger's onboarding attempt in the same
browser tab, not anything Account A did.

**Repro steps** (for confirmation once live-testing is back in scope):
1. Log in as an existing worker (Account A). Do not log out (no logout button
   exists, so this is just "leave the tab open").
2. In the same tab, navigate to `/worker/onboarding` and complete the signup form
   with a different email (Account B's details).
3. Reach the success screen and let it run.
4. Query `workers` for `profile_id = <Account A's uid>` — expect two rows: the
   original, plus a new one carrying Account B's `display_name`/`job_title`/
   `station`.
5. Query `auth.users` for Account B's email — expect a row exists (unconfirmed),
   with no matching `workers` row and no localStorage `pending_worker` entry ever
   written for it (verify via the same browser's devtools if reproducing
   interactively).

**Proposed fix (not applied)**: before calling `signUp()`, check
`supabase.auth.getSession()` — if a session already exists and its user's email
doesn't match the form's email being submitted, either (a) sign the existing
session out first, or (b) block the submission with a clear "you're already
logged in as a different account — log out first" message, rather than silently
proceeding. This is a small, contained change to `SuccessScreen`'s effect,
doesn't touch any other flow.

## Other issues surfaced while diagnosing (not separately requested, adjacent to
the above)

- **No logout button exists anywhere in the app** (confirmed in the earlier auth
  audit, re-confirmed relevant here since it's the reason stale sessions in a
  shared tab are the norm, not an edge case, for the bug above). `signOut()` is
  defined in `src/services/auth.js` but never called from any component.

# Diagnostic Report — 2026-07-18

> Read-only diagnostic session. No migrations, code changes, deletions, edge-function
> deploys, DB writes, or fixes were applied during this pass — everything below is a
> finding for review, not an action taken. The staged MFA migration
> (`0014_auth_role_require_aal2.sql`) and the edited `review-kyc`/`set-payout-status`
> edge functions remain un-applied/un-deployed, exactly as left — confirmed via
> `list_migrations` (last applied: `drop_stale_decide_kyc_overload`, 0013) and by not
> having touched them this session.

## get_advisors (security) — no change

Same 3 WARNs as the last several checks: `auth_role()` executable by `anon`/
`authenticated` (reviewed, intentional — RLS policies call it directly) and
"Leaked Password Protection Disabled" (still open, unchanged). Nothing new.

## 1. Deployment contradiction — findings

Delegated to a read-only sub-agent (Vercel + Netlify MCP tools, git remotes/branches,
repo config files). Full findings:

- **No SwiftTip deployment exists on Vercel.** 7 projects in the linked team
  (`leavehub`, `soulbridge`, `haulytics-project`, `vite-react`, `wsuview`,
  `wsuview-twjz`, `haulytics-dashboard`) — none is this app. The one ambiguous
  candidate by name (`vite-react`) predates this repo (created Sept 2025 vs. this
  repo's July 2026 origin), has no linked git repo, `live: false`, and only
  auto-generated preview-style domains — not a production alias for anything.
- **No SwiftTip deployment exists on Netlify** — one project only (`leavehub`,
  unrelated).
- **No deployment config committed anywhere in the repo** — no `vercel.json`,
  `netlify.toml`, `.vercel/` directory.
- **Git remotes/branches**: single remote `origin` →
  `https://github.com/langaludidi/swifttip.git`. Local branch `production-mvp`
  (active work). `origin/HEAD` points at `claude/nice-bardeen-we0hfg`, not
  `production-mvp` — a minor git-config oddity, not a deployment issue, noted for
  awareness only.

**Conclusion: there is no deployment contradiction to resolve, because there is no
deployment at all.** This reconfirms what an earlier session already established —
the app has only ever run locally via `npm run dev`. Nothing to check regarding
which Supabase ref a live build points at, because no live build exists.

## 2. RLS + policy inventory

All 11 public-schema tables have RLS **enabled** (`rls_enabled: true` for
`audit_logs`, `compliments`, `employers`, `kyc_documents`, `ledger_entries`,
`payout_accounts`, `payouts`, `profiles`, `tips`, `wallets`, `workers`). None have
`FORCE ROW LEVEL SECURITY` set, which only matters for table owners bypassing RLS —
not a concern here since the app never connects as the table owner.

| Table | Policy | Cmd | USING | WITH CHECK |
|---|---|---|---|---|
| audit_logs | admin read | SELECT | `auth_role() = 'admin'` | — |
| compliments | public read | SELECT | `true` | — |
| employers | insert own | INSERT | — | `owner_id = auth.uid()` |
| employers | owner or admin | SELECT | `owner_id = auth.uid() OR auth_role() = 'admin'` | — |
| kyc_documents | insert self | INSERT | — | `worker_id IN (workers where profile_id = auth.uid())` |
| kyc_documents | own or admin | SELECT | `auth_role() = 'admin' OR worker_id IN (own workers)` | — |
| ledger_entries | own or admin | SELECT | `auth_role() = 'admin' OR wallet_id IN (own wallet via workers)` | — |
| payout_accounts | insert self | INSERT | — | `worker_id IN (own workers)` |
| payout_accounts | own or admin | SELECT | `auth_role() = 'admin' OR worker_id IN (own workers)` | — |
| payouts | own or admin | SELECT | `auth_role() = 'admin' OR worker_id IN (own workers)` | — |
| profiles | own or admin | SELECT | `id = auth.uid() OR auth_role() = 'admin'` | — |
| **profiles** | **update own** | **UPDATE** | `id = auth.uid()` | **none** |
| tips | visibility | SELECT | `auth_role() = 'admin' OR own worker OR employer-linked worker` | — |
| wallets | owner employer admin | SELECT | `auth_role() = 'admin' OR own worker OR employer-linked worker` | — |
| workers | insert self | INSERT | — | `profile_id = auth.uid()` |
| workers | public active read | SELECT | `active = true OR profile_id = auth.uid() OR auth_role() = 'admin' OR employer-linked` | — |
| **workers** | **admin update** | **UPDATE** | `auth_role() = 'admin'` | **none** |

No client-side INSERT/UPDATE/DELETE policy exists at all for `wallets`, `tips`,
`payouts`, or `ledger_entries` — confirmed unchanged from prior sessions; all
writes to those four go through edge functions or `settle_tip()`/`decide_kyc()`
using the service role.

**Flagged — row-but-not-column scoping (the C4/C5/C6 shape):**

- **`profiles update own`** — still `USING (id = auth.uid())` with **no `WITH
  CHECK`**. This is the exact C6 shape: row-scoped, not column-scoped. **This is
  not a live vulnerability today** — a `BEFORE UPDATE` trigger,
  `profiles_prevent_self_role_change`, is confirmed still active (checked via
  `information_schema.triggers`) and closes the actual role-escalation path at the
  trigger layer. But the RLS policy itself, read in isolation, still shows the
  pattern — worth knowing the compensating control lives in a trigger, not the
  policy, so anyone auditing the policy alone would (correctly) flag it before
  checking for the trigger.
- **`workers admin update`** — same shape: `USING (auth_role() = 'admin')`, no
  `WITH CHECK`. Lower severity than the profiles case (the actor is already
  admin-authenticated post-C5, not an arbitrary caller), but structurally
  identical: an admin session could in principle update any column on any
  `workers` row directly, bypassing `decide_kyc()`'s validation/audit-trail
  entirely. This is the same "admin-side integrity gap" already documented as
  open in `06-production-checklist.md` — not a new finding, but confirmed still
  present and matching the requested shape exactly.

**Grants for deferred features:**

- **`employers insert own`** (`owner_id = auth.uid()`, no further validation) and
  **`employers owner or admin`** (read) are both live and reachable via
  `/employer/onboarding` — a route with no role guard (see §4, item 2). Employer
  self-service is deferred to pilot #2 per `CLAUDE.md`, but the grants backing it
  are live in the database today, matching the exact shape that produced C5.
  `workers insert self`'s `WITH CHECK` also still only validates `profile_id`,
  never `employer_id` — already tracked in `06-production-checklist.md` as a
  pilot-2 prerequisite, confirmed unchanged.

## 3. SECURITY DEFINER + grants sweep

| Function | SECURITY DEFINER | anon EXEC | authenticated EXEC | service_role EXEC |
|---|---|---|---|---|
| `auth_role()` | yes | **true** | **true** | true |
| `decide_kyc(uuid, worker_status, text, uuid)` | yes | false | false | true |
| `handle_new_user()` | yes | false | false | true |
| `handle_new_worker()` | yes | false | false | true |
| `prevent_self_role_change()` | yes | false | false | true |
| `settle_tip(uuid)` | yes | false | false | true |

**No new SECURITY DEFINER functions exist beyond these six** — confirmed against
the full `pg_proc` listing for the `public` schema. The stale `decide_kyc(uuid,
text, uuid, text)` overload (drift incident #3) is confirmed still gone. Nothing
anon/authenticated-callable bypasses RLS beyond `auth_role()` itself, which is
intentionally callable (it's invoked from inside RLS policy expressions and only
returns the caller's own role — not independently exploitable, as established in
the prior audit).

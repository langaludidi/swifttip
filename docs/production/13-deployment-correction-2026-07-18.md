# Deployment Finding — Correction — 2026-07-18

> Read-only. No fixes applied, no Vercel/Supabase config changed, no branch
> touched. This corrects §1 of `09-diagnostic-report-2026-07-18.md`, which
> concluded no deployment existed — that conclusion was wrong, and this
> document explains exactly how it was wrong and what's actually there.

## Why the earlier check missed it

Both my own `list_projects`/`get_project` calls (via the Vercel MCP tool) and a
sub-agent's independent check found no project named `swifttip` under the
visible team (`ludidil-5352s-projects`, `team_x8GuDzdDLq89or5orIoRymn8`) — and a
direct `get_project`/`get_deployment` lookup by the exact project/deployment IDs
you supplied both returned genuine `404`s from Vercel's own API, not a listing
gap. The team slug matches exactly, so this looks like an account/token scope
mismatch — this session's Vercel integration cannot see this project, even
though it visibly exists at the URLs you gave. I could not resolve this further
with available tools; flagging it as its own item, separate from the findings
below, which come from directly fetching the public URLs (no Vercel API needed
for any of this).

## What's actually live

`https://swifttip.vercel.app/` returns **HTTP 200** — a real, working, publicly
reachable deployment exists. This directly contradicts the prior report.

### Finding 1 — it's built from a severely stale branch

The production alias serves a build whose git history (traced via
`origin/claude/nice-bardeen-we0hfg`, matching the URL's own preview-deployment
naming — `swifttip-git-claude-nice-bardeen-we0hfg-...vercel.app`) stops at commit
`5085651`, **before every security fix and feature built in this entire
engagement**. Diffed against `production-mvp`: 48 files differ, 2,795 lines would
be deleted to match this branch. Specifically absent from this branch entirely:

- Migrations 0002 through 0013 — meaning **no C4 role-escalation fix, no C5
  workers-self-approval fix, no C6 profiles.role fix, no drift-3 stale-function
  fix**, no KYC review pipeline, no audit_logs, none of it.
- A completely different `paystack-webhook/index.ts` — this branch's version is
  a **10-line no-op stub** that returns `{ok:true}` for literally any request,
  with no signature verification, no `settle_tip` call, nothing:
  ```ts
  import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
  serve(async (req) => {
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    })
  })
  ```
- Different, older versions of `create-tip`, `request-payout`, `review-kyc`,
  `submit-kyc`, `get-tip-status`, `set-payout-status`, plus a `settle-tip`
  function that appears to have been the primary settlement path before this
  project moved to the current `settle_tip()` RPC + HMAC-verified webhook
  pattern.

**Important reassurance, not just alarm**: the actual Supabase project
(`dmkaqmbuoosolsnkkmiq`) has already had `list_edge_functions`/`get_edge_function`
checked multiple times this engagement, and the *deployed* `paystack-webhook`,
`review-kyc`, etc. match the current, patched `production-mvp` code exactly —
edge function deployment is a separate, explicit action from which git branch a
repo folder happens to contain, so the stale branch's stub code was never
actually running server-side. Likewise, RLS policies and the `decide_kyc()`/
`handle_new_user()` triggers are database-level and enforced identically no
matter which frontend build calls them. **The security fixes are not undone by
this stale frontend** — the backend a customer's browser actually talks to is
the current, patched one, regardless of which branch built the page they're
looking at. What the stale branch actually costs is missing *features* (no KYC
review screen, no admin console additions, an old broken worker-onboarding flow)
and general confusion about what's "live," not a reopened security hole.

### Finding 2 — even so, none of it can reach the backend at all right now

This is the more urgent, independent problem. Extracted directly from the live
JS bundle (`https://swifttip.vercel.app/assets/index-DXz1VPgd.js`), the exact
minified initialization line:

```js
const kf="https://supabase.com/dashboard/project/dmkaqmbuoosolsnkkmiq",
      A0="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRta2FxbWJ1b29zb2xzbmtrbWlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3MTQxNjQsImV4cCI6MjA5OTI5MDE2NH0...",
      En=P0(kf,A0),   // createClient(url, key)
      Nh=!kf          // isDemo = !url
```

`kf` is `VITE_SUPABASE_URL` as configured in this Vercel project's environment —
and it's set to **`https://supabase.com/dashboard/project/dmkaqmbuoosolsnkkmiq`**,
the human-facing dashboard page for this project, not the actual API host
(`https://dmkaqmbuoosolsnkkmiq.supabase.co`). Someone copied the browser address
bar URL instead of the "Project URL" field from Settings → API. The anon key
(`A0`) is correct — decoding its JWT payload gives `{"ref":
"dmkaqmbuoosolsnkkmiq", "role": "anon", ...}`, confirming the right project was
intended, just the wrong string ended up in the URL field.

**Confirmed empirically**: I called the exact broken URL the way the deployed
app would (`GET .../rest/v1/workers?select=id&limit=1` with that same apikey
header) — it returns **HTTP 404 with Supabase's own marketing-site HTML shell**,
not a JSON response of any kind. Every Auth call, every table read, every
Storage call this deployed build makes fails the same way. And because `kf` is
a non-empty string, `Nh` (`isDemo`) evaluates to `false` — the app believes it's
in real mode and will not fall back to sample/demo data; it will attempt real
calls and get 404 HTML back for all of them.

**Net effect**: right now, the public production URL is both severely
out-of-date *and* completely non-functional for anything requiring the backend
— worker signup, login, tipping, KYC, all of it. A visitor today gets a page
that loads, then fails everything they try to do.

## Summary of what needs a decision, not a fix from me right now

1. Resolve the Vercel-account visibility gap (this session's connection cannot
   see this project — likely a different logged-in account than the one this
   URL belongs to).
2. Decide whether to re-point the Vercel project at `production-mvp` (bringing
   in every security fix and feature since commit `5085651`) or keep it on the
   current branch deliberately, if there's a reason for that separation this
   report doesn't have visibility into.
3. Fix the `VITE_SUPABASE_URL` environment variable in the Vercel project
   settings to the actual API host, regardless of which branch is chosen.

No changes made to Vercel, the branch, or the environment variable — this is a
report for your review, per the standing read-only instruction.

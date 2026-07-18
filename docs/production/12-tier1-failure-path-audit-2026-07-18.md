# Tier 1 Failure-Path Audit — 2026-07-18

> Report only, prepping Sprint G — no fixes applied. Traced against the actual live
> code: `create-tip`, `paystack-webhook`, `settle_tip()`, `get-tip-status`,
> `TipPage.jsx`, `CustomerFlow.jsx`.

## How the happy path actually resolves (for reference against each failure case)

`create-tip` creates a `pending` tip, calls Paystack `/transaction/initialize`,
redirects to the returned `authorization_url`. Paystack redirects back to
`callback_url` (`/tip/:slug?reference=...`). `TipPage.jsx` then polls
`get-tip-status` every 1.5s, up to 14 tries (~21s), watching for `tips.status` to
become `'settled'` (only ever set by `settle_tip()`, only ever called by
`paystack-webhook`'s HMAC-verified `charge.success` handler) or `'failed'`.

## The six named cases

| Case | Handled? | Evidence |
|---|---|---|
| **Declined card** | **No — this is the sharpest gap in the whole audit.** | `paystack-webhook/index.ts` has exactly one event branch: `if (event.event === 'charge.success')`. There is no handling for a decline/failure event at all — the function falls through to `return json({ ok: true })` regardless. A declined card at Paystack's hosted checkout page never transitions `tips.status` to `'failed'` — the only place that ever writes `'failed'` is `create-tip`'s own immediate-initialize-failure branch (Paystack rejecting the *initialize* call itself, before the customer ever reaches the card page). The customer is redirected back with a `reference` regardless of the decline, `TipPage` polls, sees `status: 'pending'` forever, and after ~21s falls into `PendingTimeoutScreen` — **"Still confirming with the bank... no need to pay again."** That message is actively wrong for a declined card: the payment did not go through, and telling the customer not to retry is the opposite of correct guidance. There is no way, today, for a declined card to ever resolve to the `FailedScreen`'s correct "Payment didn't go through... you can try again" message. |
| **Closed browser mid-pay** | Partially — resolves to an inert state, not a broken one, but with no cleanup. | If the customer closes the tab after redirect to Paystack but before completing or declining, no webhook ever fires (no charge attempt completed), and the tip stays `'pending'` indefinitely. Not a crash or a false success — but there's no expiry/reconciliation job anywhere in the codebase that ever revisits a `pending` tip older than some threshold. An abandoned tip is invisible clutter, not a bug, but nothing currently surfaces or cleans these up. |
| **Paystack down** | **Yes**, for the specific case of Paystack being unreachable at the *initialize* step. `create-tip` wraps the fetch, checks `!psRes.ok \|\| !ps.status`, marks the tip `'failed'`, returns a 502. `CustomerFlow.jsx`'s `goToCheckout` checks `if (error \|\| !tip?.authorization_url)`, shows an inline error, returns to the amount screen. This is the one case that correctly reaches a real failure state. | Not handled: Paystack going down *after* initialize succeeds but *before* the webhook fires — indistinguishable from "webhook delayed" below from the customer's side, and from "declined card" above from the system's side (both just never move off `pending`). |
| **Webhook delayed** | **Yes, reasonably.** | This is exactly what the poll/timeout/retry design is for: `TipPage.jsx` polls for ~21s, then shows `PendingTimeoutScreen` with an honest "taking longer than usual... no need to pay again" message and a manual "Check again" button (re-triggers polling via `pollNonce`). This message is *correct* for this specific case (webhook genuinely still in flight) — it's only wrong when the real cause is a decline, and the customer/system have no way to distinguish the two today, per the first row. |
| **Worker suspended between scan and pay** | Split — one moment is checked, the other isn't, by what looks like design rather than oversight, but it's undocumented either way. | If deactivation happens *before* the customer completes `create-tip` (between scanning the QR and hitting "pay"), it's caught: `create-tip` independently re-checks `workers.active` at call time (`.select('id, active').eq('id', worker_id).single()`, 404s if inactive) — this is real defense-in-depth, not just relying on the page having loaded the worker as active earlier. If deactivation happens *after* `create-tip` succeeds but *before* the webhook settles (money already in flight), `settle_tip()` does **not** re-check `workers.active` at all — it settles and credits unconditionally. A worker suspended mid-flight for cause still gets paid for a tip that was already committed. This may be the intended behavior (a customer who already committed to paying probably shouldn't have their payment silently voided by an unrelated admin action seconds later) — but it isn't written down anywhere as a decision, so it reads as an open question for Sprint G rather than a settled one. |
| **Replaced QR** | Not currently a live risk, because the underlying feature (changing a worker's slug) doesn't exist yet. | `createWorker` sets `slug` once at creation with collision-retry; there is no function anywhere in the codebase that updates an existing worker's `slug`. So "an old physical QR silently starts pointing at a different worker" isn't reachable today — slugs are immutable and unique (`workers_slug_key`), and workers are never deleted (no delete path exists), so a slug can't be freed up and reclaimed by someone else either. The only real-world version of "replaced QR" today is a **lost or damaged physical badge**, which the Operational Plan already treats as a pure ops process ("reprint and reissue same day; the QR ties to the worker ID") — not something the app needs to handle in code. |

## Summary for Sprint G scoping

The one finding that actually needs a decision and a fix, not just documentation,
is the declined-card path — it's not a partial gap, it's a complete absence: no
Paystack failure event is handled anywhere, so no card decline can ever resolve
correctly. Everything else in this list is either already handled reasonably
(Paystack-down-at-initialize, webhook-delayed) or not currently a live risk given
what's actually built (replaced QR). The mid-flight-suspension question is worth
an explicit decision recorded somewhere, even if the current unconditional-credit
behavior turns out to be the one you want to keep.

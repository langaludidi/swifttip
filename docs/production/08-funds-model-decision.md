# Funds Model Decision Brief

> **This is a brief for a South African fintech/regulatory specialist, not an
> engineering decision document.** No option below is recommended. Its purpose is to
> put the concept documents, the actual live code, the concrete options, and the
> open questions in one place so the decision can be made with full information.
> Prepared 2026-07-18.

## Source documents

Four planning documents were located on the founder's Mac (iCloud Drive,
`SwiftTip/` folder) — not one. All four are dated **Version 1.0/1.1, June 2026**:

- `SwiftTip Concept Document.docx`
- `SwiftTip Product Strategy.docx`
- `SwiftTip Business Plan.docx`
- `SwiftTip Operational Plan.docx`

Copies of all four are stored alongside this brief at
`docs/production/source-concept-docs/`. Quotes below are verbatim, with section
references to the source document.

## 1. What the concept/planning documents specify about funds flow

**The model is explicit and repeated across all four documents: pass-through, no
wallet, SwiftTip never holds funds.**

> **Concept Document, §3.2 "The pass-through model (no wallet)"**: "Tips pay
> straight through a licensed payment partner to the worker's existing bank
> account. SwiftTip never holds the worker's money — there is no wallet to build
> and no consumer funds held, which is the cleanest regulatory position. The
> worker dashboard shows a record of what has been paid, not a balance to
> withdraw."

> **Concept Document, §8 "Regulatory & Compliance — The Critical Gate"**: "Holding
> a customer's tip to pass to a worker makes SwiftTip a Third Party Payment
> Provider under SARB Directive 1 of 2007. Solution: ride a licensed payment
> partner who collects and disburses, so SwiftTip provides only technology and
> never holds funds. This clears the gate cheaply and is the launch structure."

> **Product Strategy, §3, Rule 3 "Money stays out of our stack"**: "SwiftTip never
> holds funds. A licensed payment partner collects and disburses. This keeps the
> heaviest security and regulatory burden out of your system — it is
> secure-by-design, not a feature to add later."

> **Product Strategy, §6 "The Not-Now List"** — the entry for a wallet, verbatim
> from the table: **"Stored-value wallet / card" — "Adds regulatory weight;
> pass-through is cleaner" — "Phase 3 moat feature."** In other words, the
> founder's own strategy document explicitly deferred building a wallet, on
> regulatory grounds, to a later phase that hasn't been reached.

> **Business Plan, §9 "Regulatory & Compliance — The Critical Gate"**: "The
> moment SwiftTip holds a customer's tip to pass to a worker, it is a Third Party
> Payment Provider under SARB Directive 1 of 2007, requiring registration through
> a sponsoring bank. The solution: ride a licensed payment partner who collects
> and disburses, so SwiftTip provides only the technology and worker layer and
> never holds funds."

> **Operational Plan, §2.1 "The money flow (pass-through, never held)"**:
> "SwiftTip never holds funds. A licensed payment partner collects the tip from
> the customer and disburses it to the worker's own bank account. SwiftTip
> provides the technology and the instruction — it is not the holder of the
> money. Customer pays R22 (R20 tip + R2 fee) → PSP collects → R20 routes to the
> worker's bank, R2 routes to SwiftTip → worker sees 'paid to your bank'. Target:
> split at source, so SwiftTip never touches the worker's R20. Confirmed in
> writing with the PSP."

> **Operational Plan, §6, compliance table** — "Payments status" row: **"Written
> confirmation SwiftTip is technology provider only; PSP holds funds."**

### A named payment partner — and it isn't Paystack

All four documents name the intended payment partner(s), and it is **not**
Paystack:

> **Concept Document, §7.3**: "Ozow is the likely low-cost pay-in rail; the
> pay-out provider is to be confirmed by quote."

> **Concept Document, §13.1**: "Get payment-partner quotes from Ozow and Stitch —
> pay-in, pay-out, batching, split-at-source."

> **Operational Plan, §7 "Tools & Systems"** — the Payments row: **"Ozow (in) /
> Stitch (out)" — "Cheapest reliable rail per leg."**

> **Operational Plan, §10.1 "Pilot design"** — Payment partner row: **"Ozow in /
> Stitch out (per quotes), same-day batch."**

The actual codebase integrates **Paystack**, not Ozow or Stitch. This is flagged
as an open question in §4 — none of the Paystack-specific research below (or from
the prior session) has been verified against what Ozow or Stitch actually support.

### An internal inconsistency worth surfacing, not resolving here

The four documents, despite sharing a version/date, disagree on how settled the
PSP relationship actually is:

- Concept Document, §7.3: pay-out provider "**to be confirmed** by quote" (open).
- Business Plan, §12.1 "Immediate quick wins": "**Confirm** the payment-partner
  structure in writing — one conversation clears the regulatory gate" (listed as
  a still-outstanding next step).
- Operational Plan, §2.1: "**Confirmed** in writing with the PSP" (stated as
  already done).

**Resolved, 2026-07-18, directly from the founder**: no PSP relationship is locked
in yet. SwiftTip is currently in negotiations with **Ozow and Stitch** to be
payment partners, with a signed agreement considered likely sooner rather than
later, but not yet in place. The Operational Plan's "Confirmed in writing with the
PSP" language was aspirational/premature at the time it was written, not a
description of an actual signed state — the Concept Document's "to be confirmed by
quote" and the Business Plan's "confirm... in writing" (listed as a next step) were
the accurate ones. This also confirms Ozow and Stitch specifically (not Paystack)
remain the real candidate partners, which sharpens the gap already flagged above:
their split-at-source/subaccount/Transfer capabilities still have not been
verified by anyone, in any session — and now that a decision may land soon, that
verification is time-sensitive, not theoretical.

## 2. What the code does today — the exact custody mechanism

Verified fresh against the live code on 2026-07-18 (not carried over from prior
session notes):

**`create-tip`** (`supabase/functions/create-tip/index.ts`) calls Paystack's
transaction-initialize endpoint with no split parameters at all:

```
POST https://api.paystack.co/transaction/initialize
{ email, amount, currency: 'ZAR', callback_url, metadata: { tip_id } }
```

No `subaccount`, `split_code`, `transaction_charge`, or `bearer` parameter
anywhere in the file — confirmed by direct grep, one `fetch` call total, to this
single endpoint. **100% of every customer payment settles into SwiftTip's own
Paystack merchant balance.**

**`paystack-webhook`** (HMAC-SHA512 verified) calls `settle_tip(tip_id)`, a
Postgres function which: marks the tip `settled`, credits `wallets.balance_cents`
by the tip amount, and inserts a `credit` row into `ledger_entries`.

**`request-payout`** (`supabase/functions/request-payout/index.ts`) — confirmed
fresh: resolves the caller's own `worker_id` from their JWT, checks
`wallets.balance_cents` is sufficient, **debits** `wallets.balance_cents` with an
optimistic lock, inserts a row into `payouts` (`status: 'requested'`), and inserts
a `debit` row into `ledger_entries`.

**`set-payout-status`** (`supabase/functions/set-payout-status/index.ts`) —
confirmed fresh: admin-JWT-gated, and its entire effect is:

```ts
const update = { status };
if (status === 'paid') update.settled_at = new Date().toISOString();
await supabase.from('payouts').update(update).eq('id', payout_id);
```

That's the whole function. **A repo-wide grep for `paystack.co/transfer`,
`transferrecipient`, or `transfer_recipient` across every edge function returns
zero matches.** There is no Paystack Transfers API call, no bank-to-bank movement
triggered by the app, anywhere in the codebase.

**`payouts` table** (`0001_init.sql`): `id, worker_id, amount_cents, status
(requested/approved/paid/rejected), requested_at, settled_at` — exists exactly as
described, confirmed fresh from the migration.

**`ledger_entries` table** (`0001_init.sql`): `id, wallet_id, tip_id, payout_id,
kind (credit/debit), amount_cents, created_at` — exists exactly as described,
confirmed fresh from the migration.

**Conclusion**: marking a payout `'paid'` today is an admin *asserting* that they
already moved real money to the worker's bank account manually, outside the app
entirely, using the banking details in `payout_accounts`. SwiftTip's own Paystack
account holds every rand from every tip until a human moves it out by hand. This
is unambiguous custody — the exact model the concept documents describe SwiftTip
as needing to avoid.

## 3. The three options

### Option A — Split-at-source (subaccounts): SwiftTip never holds funds

**What survives**: the customer-facing tip/checkout/QR flow; `paystack-webhook`
(still needed for reporting, though no longer mutating a spendable balance);
essentially all of the sign-up/KYC/admin-review pipeline (Sprint 2 and Sprint A's
work — verifying who a worker is doesn't depend on the funds model).

**What gets deleted**: `request-payout`, `set-payout-status`, the `payouts`
table's approval workflow, `wallets.balance_cents` as a *spendable* balance
(it could survive as a read-only running-total display, matching the concept
docs' "a record of what has been paid, not a balance to withdraw"), the entire
"overnight payout batch" concept, and the Tier 3 console item "mark payouts paid."
`create-tip` needs a parameter-level change (add `subaccount`/`split` to the
Paystack initialize call). `payout_accounts`' data (bank details) survives but its
purpose changes — from feeding a manual EFT to configuring a Paystack subaccount.

**What Paystack supports in SA**: subaccounts + Transaction Splits, in ZAR, for
South Africa-registered businesses — split by percentage or a flat
`transaction_charge` passed as `subaccount: "SUB_xxx"` on
`/transaction/initialize`. Settlement of the split happens on Paystack's own
schedule, not one SwiftTip chooses.

**Not yet verified**: whether **Ozow or Stitch** — the providers actually named
in the concept/planning documents — support an equivalent split-at-source
mechanism at all. Everything Paystack-specific here has no confirmed bearing on
Ozow/Stitch's actual capabilities.

**Regulatory exposure (per the concept documents' own framing)**: lowest — this is
the model the documents argue avoids Third Party Payment Provider classification
under SARB Directive 1 of 2007 entirely, and is the only option that clears the
item explicitly left on the Product Strategy's "Not-Now List" (stored-value
wallet, deferred "because pass-through is cleaner").

### Option B — Custody + Paystack Transfers API: automate today's manual EFT

**What survives**: essentially everything currently built — `wallets`,
`ledger_entries`, `payouts`, `request-payout`, the admin console's payout screen.

**What changes**: `set-payout-status` stops being a bare status flip and becomes a
real API call — create/verify a Paystack transfer recipient, initiate a transfer,
handle transfer webhook events (success/failure).

**What Paystack supports in SA**: a Transfers API in ZAR — the specific figures
(T+2 settlement, R3 per transfer, ~1% top-up fee, and split-at-source
availability) were verified directly against Paystack's own documentation
separately today and are treated as confirmed for this brief.

**Regulatory exposure**: **this does not avoid the custody classification the
concept documents are concerned about.** SwiftTip still receives and holds 100%
of customer funds before disbursing — only the disbursement mechanism becomes
automated instead of manual. Whatever exposure exists under Option C exists here
too; this option changes operational reliability and speed, not the underlying
regulatory character.

### Option C — Custody + manual EFT: status quo

**What survives**: everything, unchanged.

**What gets deleted**: nothing.

**What Paystack supports in SA**: not applicable — no new integration required.

**Regulatory exposure**: identical to Option B on the custody question (full
custody, same Third Party Payment Provider exposure per the concept documents'
own framing), plus the operational risk the founder's own Operational Plan names
as the central risk of the whole business: "Payout Reliability Is The Business...
One delayed or failed payout spreads through a forecourt workforce in hours and
is almost impossible to recover from" (§2.2/§8.2) — manual EFT execution has no
automated reconciliation and depends on a human doing it correctly and on time,
every time.

## 4. Questions for the SA fintech/regulatory specialist

1. Does SwiftTip's current custody model (Options B and C alike) actually trigger
   Third Party Payment Provider status under SARB Directive 1 of 2007, as the
   founder's own concept documents assume — or is there a structural, volume, or
   intermediary-role factor that would exempt it regardless?
2. If Option A is pursued using **Paystack** specifically — rather than **Ozow or
   Stitch**, the partners actually named in the planning documents — does the
   choice of payment partner itself matter for SARB classification, or only the
   structural question of who holds funds and for how long?
3. What does "licensed payment partner" actually require of SwiftTip
   contractually/technically to qualify for a pass-through exemption — is a
   subaccount/split relationship with any registered PSP sufficient, or does the
   partner need to hold a specific status (e.g., a particular payment services
   license, a sponsoring-bank relationship) for the exemption to hold?
4. The concept documents assume FICA/KYC is satisfied "under the partner's
   umbrella." SwiftTip has since built its own in-house KYC document-upload and
   admin-review pipeline (private storage, manual document review, an
   admin-approval workflow) independent of any payment partner. Does that change
   or duplicate a regulatory obligation, and does it need to continue regardless
   of which funds model is chosen?
5. Does the R2 flat fee (customer-paid, worker keeps 100%) have any independent
   bearing on the custody question — is fee-taking itself relevant to Third Party
   Payment Provider status, separate from whether the tip principal is held?
6. All four documents flag an outstanding SARS ruling on tip treatment (whether
   worker-direct tips count as employer payroll). Is that ruling a prerequisite
   before *any* of the three funds-model options can be safely launched,
   independent of which one is chosen?
7. ~~Resolved 2026-07-18~~: no PSP agreement is signed yet. SwiftTip is in active
   negotiations with **Ozow and Stitch**, considered likely to close soon rather
   than later. This sharpens rather than closes the open question: **neither
   Ozow's nor Stitch's split-at-source/subaccount/Transfer capabilities in South
   Africa have been verified by anyone in any session.** That verification is now
   time-sensitive — if a decision on Option A depends on subaccount/split support
   existing at all, it needs answering before, not after, an agreement is signed.
8. `SwiftTip (Pty) Ltd` registration status — the documents state a dedicated
   entity "should be registered before collecting real revenue... not run under
   another entity." Has that registration happened, and does it gate any of the
   three options above from launching at all, independent of the funds-model
   question?
9. **Who bears a chargeback or reversal, under each of the three funds models?**
   Under Option A (split-at-source), does a customer chargeback claw back from
   SwiftTip's share, the worker's already-disbursed share, or the PSP itself —
   and can a PSP reverse funds already paid out to a worker's bank account after
   the fact? Under Options B/C (custody), SwiftTip holds the funds at chargeback
   time, but has already (Option C) or may have (Option B) disbursed to the
   worker — does SwiftTip absorb the loss, or does it have (or need) a contractual
   right to claw back from the worker? This bears directly on pilot pricing and
   on the "100% goes to the worker" guarantee under discussion in
   `15-competitive-lessons.md` and `17-gtm.md` — a guarantee that assumes no
   clawback path reaches the worker.
10. **Payout rails reaching unbanked workers** — eWallet or ATM-by-phone
    disbursement (no bank account required at the receiving end), flagged as a
    Phase 5 need in `16-vision.md`. Does Paystack support either rail for payout
    in South Africa today, under any of the three options above, or is this only
    reachable via a different/additional payment partner?
11. **Tappy's claimed SARB approval** (flagged unverified in
    `15-competitive-lessons.md`/`17-gtm.md`) — if that approval verifies as real,
    what regulatory route did Tappy actually use to get it? Alongside NoCashPay's
    claimed PASA-approved TPPP status (`15-competitive-lessons.md` item 1, which
    prompted question 1 above), this is a second real-world data point for what's
    actually achievable here — separate from whether SwiftTip should copy it.

## What's flagged as unverified, not just unresolved

- Paystack's own documentation pages (`paystack.com/docs/...`) returned HTTP 403
  to automated fetching in this and the prior session. Last session's Paystack
  facts came from search-engine summaries and a GitHub-hosted mirror of
  Paystack's documentation repository, not a directly-loaded primary page. This
  session's specific figures in §3 Option B (T+2 settlement, R3/transfer, ~1%
  top-up, split-at-source support) were separately verified today directly
  against Paystack's own documentation and are treated as confirmed here — but
  that verification was not performed by this document's author.
- **Ozow's and Stitch's actual split-at-source/subaccount/Transfer capabilities
  have not been verified at all**, in any session, by anyone. This is the single
  largest gap in this brief, and it's now time-sensitive: negotiations with both
  are active (confirmed 2026-07-18) and may close soon, before this capability
  gap has been checked.
- The "confirmed in writing" vs. "to be confirmed" inconsistency across the four
  source documents (§1) is resolved as of 2026-07-18: no agreement is signed yet;
  see specialist question 7.

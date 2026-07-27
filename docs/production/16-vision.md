# SwiftTip — Vision (2026 → 2030)

**What this document is:** the long-range ambition, phased, so the MVP doesn't have
to carry it. When someone proposes a feature, the answer lives here — "phase N" —
instead of reopening scope.

**What this document is NOT:** a build instruction. It constrains *sequencing*,
never today's architecture. We do not build abstractions today for phases that may
never come; each phase is earned by the previous one proving itself with real users
and real money. If a phase's assumptions die in the field, the phases after it are
rewritten, not defended.

---

## The one-line ambition

Become the platform South Africa's service workers trust with their appreciation
economy — starting with a tip that reaches them cleanly, ending with an identity
and earnings record they own and carry.

## The positioning (decided now, because it shapes copy and pricing)

- **Worker-first, permanently.** Workers never pay to receive what customers gave
  them. The customer covers processing; employers pay for tooling (later phases).
  "100% goes to the worker" is a promise, not a promotion.
- **Trust is the product.** Verified workers, honest UI, money that reconciles to
  the cent. The security and KYC investment is not plumbing — it is the brand.
- **Privacy-light by design.** Customers tip without accounts, apps, or being
  remembered. Workers own their data. We are the worker's platform, never the
  boss's scorecard.

---

## Phase 1 — Prove the tip (NOW — the MVP, one pilot site)

A stranger scans a verified worker's QR and tips real money; the money reaches the
worker cleanly and on time; every rand reconciles.

Scope is defined in `01-mvp-scope.md` and does not change from here. Exit criteria:
pilot runs at one fuel station, ~20 workers, with conversion, average tip, and
before/after worker earnings measured. The funds-model decision (specialist,
`08-funds-model-decision.md`) is resolved before real money.

## Phase 2 — Employer operations (after a successful pilot)

What venues need to adopt at scale: employer self-service (unfrozen from pilot-#2
deferral), multi-worker and multi-site views, team/shift reporting, invite-based
worker onboarding, agent-assisted onboarding for informal workers, simple tip
pooling where teams want it. Revenue begins here: employers pay for tooling;
workers still never pay.

## Phase 3 — Worker identity (after employers adopt)

The moat: a verified, portable, worker-owned record. Earnings history that follows
the worker across employers and brands; verified-identity credential; personal tip
page with photo and story; optional skills listing (the Tipsy pattern). Explicitly
NOT an algorithmic reputation score built from complaints or attendance — any
reputation feature is opt-in, worker-owned, and reviewed by a POPIA/labour
specialist before design begins.

## Phase 4 — Intelligence (after identity has data)

Insights on top of consented data: worker-facing earnings insights ("your best
hours"), employer benchmarking, fraud and anomaly detection, ESG/impact reporting
for corporate conversations. AI sits above the data; it never touches the payment
path. Every insight respects the Phase 3 ownership rule — workers see their own
data first, employers see aggregates.

## Phase 5 — Infrastructure (if Phases 1–4 earn it)

APIs and white-label rails so hospitality, fuel, retail, and tourism build on
SwiftTip. Additional payment rails (NFC hardware if the market proves it — see
Tappy verification in `15-competitive-lessons.md`; USSD for feature phones;
eWallet/ATM payout rails for unbanked workers — specialist question in the funds
brief). The category position: the trust layer for service-worker earnings.

---

## Standing rejections (so they stay rejected)

- **Surveillance-shaped features:** performance scores from complaints/attendance,
  manager-facing individual rankings, anything that makes SwiftTip the boss's
  scorecard. Conflicts with worker-first positioning.
- **Customer tracking without accounts:** "welcome back, you've tipped X three
  times" requires remembering customers who chose not to be remembered.
- **Loyalty-gated tipping:** the TotalEnergies pattern. Tipping stays ungated.
- **Charging workers:** in any phase, for any reason.

## How to use this document

A proposed feature gets one of four answers: (1) it's MVP scope — see
`01-mvp-scope.md`; (2) it's phase N — parked here, revisit when phase N-1 exits;
(3) it's a standing rejection — cite the reason; (4) it's genuinely new — argue it
into a phase, in writing, without touching the current phase's scope.

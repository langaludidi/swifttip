# SwiftTip MVP v3 — Implementation Architecture

## Runtime boundary

Customer, Worker, Venue and Admin interfaces share one modular web application. The browser is untrusted. The server owns pricing, eligibility, financial transitions and provider calls. PostgreSQL owns canonical persistence, RLS, constraints and durable financial history. The payment provider owns external payment and settlement truth.

## Canonical money flow

`Tip intent → Payment Attempt → Payment Event → Financial Allocations → Worker Settlement → Reconciliation`

Refunds, reversals and disputes are related financial events. They never delete the original transaction.

## Current pricing hypothesis

- Worker success fee: 5% of nominated gratuity.
- Customer service fee: R1 + 3% of nominated gratuity, capped at R5.
- All calculations use integer cents and deterministic half-up basis-point rounding.

These are versioned hypotheses, not hard-coded permanent business terms.

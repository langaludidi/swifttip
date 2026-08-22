# SwiftTip MVP v3

Greenfield implementation of the approved SwiftTip MVP v3 architecture.

## Current build status

This branch is intentionally isolated from the legacy SwiftTip application. It contains the new application shell, approved UX direction, money utilities, API contracts, database migrations, RLS design, and automated financial tests. Real payments are **disabled by default** and no payment provider is assumed.

## Hard invariants

- SwiftTip does not hold a worker wallet or stored gratuity balance.
- All authoritative money is stored/calculated in integer cents.
- Customer fee and worker success fee are explicit.
- Payment success is not settlement success.
- Browser clients cannot authoritatively set fees, payment state, settlement state, verification state or admin roles.
- Provider webhooks must be authenticated and idempotent before they can mutate financial state.
- Historical transaction economics never change when future pricing changes.
- Venue access is membership scoped.
- Admin access is role based and MFA-gated in production.

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Install dependencies with `npm install`.
3. Run `npm run dev`.
4. Create a **new** Supabase MVP v3 project before connecting the app to a database.
5. Apply migrations in `supabase/migrations` in order.

## Deliberate blockers

The following are not guessed by engineering: payment provider selection, split-at-source implementation, merchant-of-record position, chargeback liability after worker settlement, final provider KYC requirements, production OTP provider, and final gratuity limits.

Until these are resolved, provider routes fail closed and `PAYMENTS_ENABLED` remains false.

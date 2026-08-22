# Implementation Status

## Completed in this greenfield branch

- Next.js/TypeScript application structure.
- Approved customer-first UI direction with dominant Tip a Worker action.
- Canonical money calculation module and tests.
- Payment/settlement state guards and tests.
- API contracts that fail closed when provider/database are unavailable.
- Supabase-compatible schema migrations and initial RLS architecture.
- Environment and live-payment kill-switch configuration.

## Blocked without user/external intervention

- New GitHub repository creation; current work is isolated on a greenfield branch of the legacy repository.
- New Supabase MVP v3 project: Supabase requires explicit organisation/cost confirmation.
- Production OTP provider selection.
- Payment provider selection, split-at-source approval and credentials.
- Final chargeback/refund loss allocation.

No existing `SwiftTip Production` Supabase schema or legacy payout/wallet architecture is reused.

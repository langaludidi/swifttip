# SwiftTip MVP v3 runtime environments

## Canonical Supabase project

SwiftTip MVP v3 uses Supabase project ref:

`bxtfcfuehqljedxwykfk`

Project URL:

`https://bxtfcfuehqljedxwykfk.supabase.co`

The previous SwiftTip Supabase project is legacy reference only and must not be used by the MVP v3 branch.

## Vercel preview configuration

The `mvp-v3-greenfield-build` preview must use:

- `NEXT_PUBLIC_SUPABASE_URL=https://bxtfcfuehqljedxwykfk.supabase.co`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<current modern publishable key from the canonical project>`
- `SWIFTTIP_ENV=staging`
- `PAYMENTS_ENABLED=false`
- `PAYMENT_PROVIDER=unconfigured`

Do not configure a payment-provider secret or enable live payments until the provider/funds-flow release gate has been approved.

The Supabase service-role key is not required for ordinary customer, Worker, Venue or authenticated Admin surfaces. Add it only to a server-only environment when a specific approved background/provider operation requires it.

## Production configuration

Production remains deliberately gated. Deploying code is not permission to move money.

Before `PAYMENTS_ENABLED=true` can ever be considered, all of the following must be complete:

- approved provider and funds-flow architecture;
- provider sandbox success and signed webhook verification;
- Worker settlement evidence;
- chargeback/refund liability decision;
- production OTP configuration;
- Admin MFA/AAL2 verification;
- RLS and database smoke tests passing;
- reconciliation proven end-to-end;
- approved pricing activated through a new pricing version;
- controlled pilot cohort established.

## Safety invariant

If the canonical Supabase URL or publishable key is missing, the application must fail closed for live surfaces rather than silently reverting to a different database.

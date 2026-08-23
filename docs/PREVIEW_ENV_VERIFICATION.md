# SwiftTip MVP v3 — Preview Environment Verification Gate

Status: **PRE-LIVE / REQUIRED BEFORE CONTROLLED IDENTITIES**

This gate exists to prove that the greenfield Vercel Preview receives its Supabase configuration from explicit Vercel Preview environment variables. It must not rely on embedded or staging fallback credentials.

## Required greenfield Preview

Branch: `mvp-v3-greenfield-build`

The deployed `/api/health` response must report:

```text
environment: staging
hasSupabaseUrl: true
hasSupabasePublishableKey: true
supabaseConfigSource: environment
databaseConfigured: true
paymentProviderConfigured: false
paymentsEnabled: false
liveMoneyReady: false
```

A result of `supabaseConfigSource: none` or `databaseConfigured: false` means the Vercel Preview variables are not reaching the deployment and controlled identity testing must not begin.

## Required Vercel Preview variable names

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — server-only; may contain the approved Supabase secret key used by the server Admin client
- `SWIFTTIP_ENV=staging`
- `PAYMENTS_ENABLED=false`
- `PAYMENT_PROVIDER=unconfigured`

Do not record secret values in this file, build logs, screenshots or evidence packs.

## Separation rule

The historical Production deployment from `claude/nice-bardeen-we0hfg` is not evidence for this gate. Only a READY Preview deployment sourced from `mvp-v3-greenfield-build` at the recorded Git commit may satisfy it.

Passing this environment gate does not authorise legal publication, pricing activation, public Tip intake, Pilot activation or real-money operation.

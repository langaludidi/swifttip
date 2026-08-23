-- SwiftTip MVP v3 — safe working configuration only.
-- Intentionally DRAFT: engineering must not accidentally activate commercial pricing without governance.
insert into public.pricing_versions (
  version_code, pricing_status, effective_from, worker_fee_bps,
  customer_fixed_fee_cents, customer_fee_bps, customer_fee_cap_cents,
  minimum_gratuity_cents, maximum_gratuity_cents, high_value_threshold_cents, currency
) values (
  'v3-working-001', 'draft', null, 500,
  100, 300, 500,
  500, 50000, 20000, 'ZAR'
) on conflict (version_code) do nothing;

-- SwiftTip MVP v3 database smoke assertions
-- Safe to execute repeatedly. Raises an exception on invariant failure.

do $$
declare
  v_missing_rls integer;
  v_active_pricing integer;
  v_forbidden_tables integer;
begin
  select count(*) into v_missing_rls
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
    and c.relname in (
      'user_profiles','workers','venues','venue_memberships','worker_venue_associations',
      'worker_verifications','provider_settlement_profiles','worker_tipping_endpoints',
      'pricing_versions','terms_versions','terms_acceptances','pilot_cohorts',
      'pilot_cohort_venues','tips','payment_attempts','financial_allocations','settlements',
      'refunds','disputes','notifications','support_cases','admin_memberships'
    )
    and not c.relrowsecurity;
  if v_missing_rls <> 0 then
    raise exception 'RLS missing on % canonical public table(s)', v_missing_rls;
  end if;

  select count(*) into v_active_pricing
  from public.pricing_versions
  where pricing_status = 'active';
  if v_active_pricing <> 0 then
    raise exception 'Pricing must remain inactive before commercial go-live approval';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'tips'
      and column_name = 'operative_payment_attempt_id'
  ) then
    raise exception 'Operative payment attempt model is missing';
  end if;

  select count(*) into v_forbidden_tables
  from pg_tables
  where schemaname in ('public','private')
    and lower(tablename) in (
      'wallet','wallets','worker_wallets','balances','withdrawals','withdrawal_requests',
      'payouts','payout_requests','payout_batches'
    );
  if v_forbidden_tables <> 0 then
    raise exception 'Forbidden wallet/payout table exists';
  end if;

  if has_function_privilege('anon', 'public.get_worker_context()', 'EXECUTE') then
    raise exception 'Anonymous role can execute Worker context RPC';
  end if;
  if has_function_privilege('anon', 'public.get_venue_workers(uuid)', 'EXECUTE') then
    raise exception 'Anonymous role can execute Venue Worker RPC';
  end if;
  if has_function_privilege('anon', 'public.admin_get_dashboard()', 'EXECUTE') then
    raise exception 'Anonymous role can execute Admin RPC';
  end if;

  if not has_function_privilege('anon', 'public.get_public_tipping_profile(text)', 'EXECUTE') then
    raise exception 'Anonymous customer profile RPC is unavailable';
  end if;
  if not has_function_privilege('anon', 'public.quote_tip(text,bigint)', 'EXECUTE') then
    raise exception 'Anonymous quote RPC is unavailable';
  end if;
  if not has_function_privilege('anon', 'public.create_tip(text,bigint,text)', 'EXECUTE') then
    raise exception 'Anonymous Tip creation RPC is unavailable';
  end if;
  if not has_function_privilege('anon', 'public.resolve_short_code(text)', 'EXECUTE') then
    raise exception 'Anonymous short-code resolver is unavailable';
  end if;
end
$$;

select 'SwiftTip MVP v3 schema smoke assertions passed' as result;

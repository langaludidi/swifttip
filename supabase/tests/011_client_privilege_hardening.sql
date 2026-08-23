-- SwiftTip MVP v3 — regression checks for migration 0043.

do $$
declare
  v_table text;
  v_tables text[] := array[
    'admin_memberships','disputes','financial_allocations','notifications','payment_attempts',
    'pilot_cohort_venues','pilot_cohorts','pricing_versions','provider_settlement_profiles',
    'refunds','settlements','support_cases','terms_acceptances','tips','user_profiles',
    'venue_memberships','venues','worker_tipping_endpoints','worker_venue_associations',
    'worker_verifications','workers'
  ];
  v_acl text;
begin
  foreach v_table in array v_tables loop
    if not has_table_privilege('authenticated', format('public.%I',v_table), 'SELECT') then
      raise exception 'authenticated SELECT was not preserved on %', v_table;
    end if;

    if has_table_privilege('authenticated', format('public.%I',v_table), 'INSERT')
       or has_table_privilege('authenticated', format('public.%I',v_table), 'UPDATE')
       or has_table_privilege('authenticated', format('public.%I',v_table), 'DELETE')
       or has_table_privilege('authenticated', format('public.%I',v_table), 'TRUNCATE')
       or has_table_privilege('authenticated', format('public.%I',v_table), 'REFERENCES')
       or has_table_privilege('authenticated', format('public.%I',v_table), 'TRIGGER') then
      raise exception 'authenticated non-SELECT privilege remains on %', v_table;
    end if;

    if has_table_privilege('anon', format('public.%I',v_table), 'SELECT')
       or has_table_privilege('anon', format('public.%I',v_table), 'INSERT')
       or has_table_privilege('anon', format('public.%I',v_table), 'UPDATE')
       or has_table_privilege('anon', format('public.%I',v_table), 'DELETE')
       or has_table_privilege('anon', format('public.%I',v_table), 'TRUNCATE')
       or has_table_privilege('anon', format('public.%I',v_table), 'REFERENCES')
       or has_table_privilege('anon', format('public.%I',v_table), 'TRIGGER') then
      raise exception 'anonymous direct table privilege remains on %', v_table;
    end if;
  end loop;

  if has_table_privilege('authenticated','public.terms_versions','SELECT')
     or has_table_privilege('anon','public.terms_versions','SELECT') then
    raise exception 'terms_versions must remain RPC-only';
  end if;

  if not has_table_privilege('service_role','public.tips','INSERT')
     or not has_table_privilege('service_role','public.tips','UPDATE') then
    raise exception 'service_role authoritative table access was unexpectedly removed';
  end if;

  if not has_function_privilege('anon','public.create_tip(text,bigint,text)','EXECUTE') then
    raise exception 'intended anonymous create_tip RPC grant was removed';
  end if;
  if not has_function_privilege('anon','public.resolve_short_code(text)','EXECUTE') then
    raise exception 'intended anonymous short-code RPC grant was removed';
  end if;
  if not has_function_privilege('authenticated','public.start_worker_onboarding(text,text,text)','EXECUTE') then
    raise exception 'intended Worker onboarding RPC grant was removed';
  end if;
  if not has_function_privilege('authenticated','public.admin_get_commercial_readiness()','EXECUTE') then
    raise exception 'intended Admin readiness RPC grant was removed';
  end if;

  select d.defaclacl::text into v_acl
  from pg_default_acl d
  join pg_namespace n on n.oid=d.defaclnamespace
  join pg_roles r on r.oid=d.defaclrole
  where n.nspname='public' and r.rolname='postgres' and d.defaclobjtype='r';
  if coalesce(v_acl,'') like '%anon=%' or coalesce(v_acl,'') like '%authenticated=%' then
    raise exception 'postgres table default privileges still expose client roles: %', v_acl;
  end if;

  select d.defaclacl::text into v_acl
  from pg_default_acl d
  join pg_namespace n on n.oid=d.defaclnamespace
  join pg_roles r on r.oid=d.defaclrole
  where n.nspname='public' and r.rolname='postgres' and d.defaclobjtype='f';
  if coalesce(v_acl,'') like '%anon=%' or coalesce(v_acl,'') like '%authenticated=%' then
    raise exception 'postgres function default privileges still expose client roles: %', v_acl;
  end if;

  select d.defaclacl::text into v_acl
  from pg_default_acl d
  join pg_namespace n on n.oid=d.defaclnamespace
  join pg_roles r on r.oid=d.defaclrole
  where n.nspname='public' and r.rolname='postgres' and d.defaclobjtype='S';
  if coalesce(v_acl,'') like '%anon=%' or coalesce(v_acl,'') like '%authenticated=%' then
    raise exception 'postgres sequence default privileges still expose client roles: %', v_acl;
  end if;
end;
$$;

select '011_client_privilege_hardening: PASS' as result;

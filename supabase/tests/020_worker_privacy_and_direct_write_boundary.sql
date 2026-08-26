-- SwiftTip MVP v3 — non-mutating Worker privacy and direct-write boundary.

begin;

do $$
declare
  v_forbidden text[];
begin
  select array_agg(name) into v_forbidden
  from (
    select unnest(coalesce(p.proargnames,'{}'::text[])) as name
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='get_public_tipping_profile'
  ) q
  where name in (
    'legal_first_name','legal_last_name','phone','email','identity_number',
    'identity_number_last4','storage_path','provider_account_ref','masked_destination'
  );

  if coalesce(cardinality(v_forbidden),0) <> 0 then
    raise exception 'Public tipping projection exposes forbidden private columns: %', v_forbidden;
  end if;
end;
$$;

select set_config('swifttip_test.worker_id',(select id::text from auth.users where phone is not null),true);
set local role authenticated;

do $$
declare
  v_worker_user_id uuid := current_setting('swifttip_test.worker_id')::uuid;
  v_visible integer;
begin
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub',v_worker_user_id,'role','authenticated','aal','aal1')::text,
    true
  );

  select count(*)::integer into v_visible from public.workers;
  if v_visible <> 1 then raise exception 'Worker self-read did not resolve exactly one Worker row'; end if;

  if has_table_privilege('authenticated','public.workers','UPDATE')
     or has_table_privilege('authenticated','public.worker_verifications','UPDATE')
     or has_table_privilege('authenticated','public.worker_tipping_endpoints','INSERT')
     or has_table_privilege('authenticated','public.worker_tipping_endpoints','UPDATE')
     or has_table_privilege('authenticated','public.provider_settlement_profiles','INSERT')
     or has_table_privilege('authenticated','public.provider_settlement_profiles','UPDATE') then
    raise exception 'Authenticated client has direct authoritative Worker write privileges';
  end if;

  if has_table_privilege('authenticated','private.worker_identity_claims','SELECT')
     or has_table_privilege('authenticated','private.verification_documents','SELECT')
     or has_table_privilege('authenticated','private.runtime_controls','SELECT')
     or has_table_privilege('authenticated','private.runtime_controls','UPDATE') then
    raise exception 'Authenticated client has direct private identity/control-table access';
  end if;
end;
$$;

rollback;
select '020_worker_privacy_and_direct_write_boundary: PASS' as result;

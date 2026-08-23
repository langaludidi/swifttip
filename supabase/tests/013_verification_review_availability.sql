-- SwiftTip MVP v3 — reviewer evidence-availability projection checks.

do $$
declare
  v_def text;
begin
  if has_function_privilege('anon','public.admin_get_verification_detail(uuid)','EXECUTE') then
    raise exception 'anon can access Verification Admin detail';
  end if;
  if not has_function_privilege('authenticated','public.admin_get_verification_detail(uuid)','EXECUTE') then
    raise exception 'Verification Admin detail RPC is unavailable to authenticated sessions';
  end if;

  select pg_get_functiondef(p.oid) into v_def
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='admin_get_verification_detail'
    and pg_get_function_identity_arguments(p.oid)='p_verification_id uuid';

  if v_def is null then raise exception 'admin_get_verification_detail(uuid) missing'; end if;
  if position('require_admin_role' in v_def)=0 or position('verification_admin' in v_def)=0 or position('super_admin' in v_def)=0 then
    raise exception 'Verification detail no longer enforces Verification/Super Admin role';
  end if;
  if position('storage.objects' in v_def)=0 or position('storage_object_id' in v_def)=0 then
    raise exception 'Verification detail no longer checks the bound physical Storage object';
  end if;
  if position('storage_object_available' in pg_get_function_result((select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='admin_get_verification_detail' and pg_get_function_identity_arguments(p.oid)='p_verification_id uuid'))) = 0 then
    raise exception 'Verification detail no longer returns storage_object_available';
  end if;
end;
$$;
select '013_verification_review_availability: PASS' as result;

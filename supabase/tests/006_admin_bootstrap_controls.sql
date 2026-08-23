-- SwiftTip MVP v3 — Admin bootstrap privilege/regression smoke suite.
-- Safe to run before or after real Admin identities exist.

do $$
declare
  v_missing_user uuid := gen_random_uuid();
begin
  if to_regprocedure('public.bootstrap_admin_membership(uuid,text,boolean)') is null then
    raise exception 'bootstrap_admin_membership function is missing';
  end if;

  if has_function_privilege('anon', 'public.bootstrap_admin_membership(uuid,text,boolean)', 'EXECUTE') then
    raise exception 'anon must not execute bootstrap_admin_membership';
  end if;

  if has_function_privilege('authenticated', 'public.bootstrap_admin_membership(uuid,text,boolean)', 'EXECUTE') then
    raise exception 'authenticated must not execute bootstrap_admin_membership';
  end if;

  if not has_function_privilege('service_role', 'public.bootstrap_admin_membership(uuid,text,boolean)', 'EXECUTE') then
    raise exception 'service_role must execute bootstrap_admin_membership';
  end if;

  begin
    perform public.bootstrap_admin_membership(v_missing_user, 'not_a_role', false);
    raise exception 'invalid Admin role unexpectedly succeeded';
  exception
    when others then
      if sqlerrm not like '%Unsupported Admin role%' then
        raise;
      end if;
  end;

  begin
    perform public.bootstrap_admin_membership(v_missing_user, 'super_admin', false);
    raise exception 'missing Auth user unexpectedly succeeded';
  exception
    when others then
      if sqlerrm not like '%Auth user does not exist%' then
        raise;
      end if;
  end;
end;
$$;

select '006_admin_bootstrap_controls: PASS' as result;

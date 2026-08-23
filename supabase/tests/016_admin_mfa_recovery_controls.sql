-- SwiftTip MVP v3 — Admin MFA recovery privilege regression suite.

do $$
declare
  v_definition text;
begin
  if has_function_privilege('anon','public.record_admin_mfa_recovery_event(uuid,text,text,text)','EXECUTE') then
    raise exception 'Anonymous callers must not record Admin MFA recovery events';
  end if;
  if has_function_privilege('authenticated','public.record_admin_mfa_recovery_event(uuid,text,text,text)','EXECUTE') then
    raise exception 'Authenticated callers must not record Admin MFA recovery events';
  end if;
  if not has_function_privilege('service_role','public.record_admin_mfa_recovery_event(uuid,text,text,text)','EXECUTE') then
    raise exception 'Service role must retain MFA recovery audit execution';
  end if;

  select pg_get_functiondef('public.record_admin_mfa_recovery_event(uuid,text,text,text)'::regprocedure)
    into v_definition;
  if v_definition not ilike '%auth.role() <> ''service_role''%'
     or v_definition not ilike '%admin_status=''active''%'
     or v_definition not ilike '%Detailed recovery reason required%'
     or v_definition not ilike '%admin_mfa_factor_recovered%'
     or v_definition not ilike '%sessions_expected_revoked%' then
    raise exception 'MFA recovery audit control definition drifted';
  end if;
end;
$$;

select '016_admin_mfa_recovery_controls: PASS' as result;

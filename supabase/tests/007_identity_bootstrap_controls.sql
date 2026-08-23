-- SwiftTip MVP v3 — identity bootstrap and Venue invite privilege controls.

do $$
begin
  if has_function_privilege('anon', 'public.record_worker_auth_bootstrap(uuid,text,boolean)', 'EXECUTE') then
    raise exception 'anon must not execute Worker Auth bootstrap audit';
  end if;

  if has_function_privilege('authenticated', 'public.record_worker_auth_bootstrap(uuid,text,boolean)', 'EXECUTE') then
    raise exception 'authenticated must not execute Worker Auth bootstrap audit';
  end if;

  if not has_function_privilege('service_role', 'public.record_worker_auth_bootstrap(uuid,text,boolean)', 'EXECUTE') then
    raise exception 'service_role must execute Worker Auth bootstrap audit';
  end if;

  if has_function_privilege('anon', 'public.admin_invite_venue_member_by_email(uuid,text,text)', 'EXECUTE') then
    raise exception 'anon must not execute Venue invitation by email';
  end if;

  if not has_function_privilege('authenticated', 'public.admin_invite_venue_member_by_email(uuid,text,text)', 'EXECUTE') then
    raise exception 'authenticated must be able to call the Venue invitation RPC; internal Admin/AAL2 checks remain authoritative';
  end if;

  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'record_worker_auth_bootstrap'
      and p.prosecdef
  ) then
    raise exception 'Worker Auth bootstrap audit must remain SECURITY DEFINER';
  end if;
end;
$$;

select '007_identity_bootstrap_controls: PASS' as result;

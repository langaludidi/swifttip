-- SwiftTip MVP v3 — authentication/session abuse-control regression suite.

begin;

do $$
declare
  v_definition text;
begin
  if has_table_privilege('anon','private.auth_attempt_buckets','SELECT')
     or has_table_privilege('authenticated','private.auth_attempt_buckets','SELECT')
     or has_table_privilege('anon','private.auth_abuse_secret','SELECT')
     or has_table_privilege('authenticated','private.auth_abuse_secret','SELECT') then
    raise exception 'Auth abuse-control private state must not be client-readable';
  end if;

  if not has_function_privilege('anon','public.auth_abuse_admit(text,text,text)','EXECUTE')
     or not has_function_privilege('authenticated','public.auth_abuse_admit(text,text,text)','EXECUTE') then
    raise exception 'Auth admission RPC grants are missing';
  end if;

  if has_function_privilege('anon','public.session_access_allowed(text)','EXECUTE')
     or not has_function_privilege('authenticated','public.session_access_allowed(text)','EXECUTE') then
    raise exception 'Session-access RPC grants are incorrect';
  end if;

  select pg_get_functiondef('private.current_worker_id()'::regprocedure) into v_definition;
  if v_definition not ilike '%7 days%' or v_definition not ilike '%session_within_max_age%' then
    raise exception 'Worker session max-age enforcement drifted';
  end if;

  select pg_get_functiondef('private.current_venue_role(uuid)'::regprocedure) into v_definition;
  if v_definition not ilike '%24 hours%' or v_definition not ilike '%session_within_max_age%' then
    raise exception 'Venue session max-age enforcement drifted';
  end if;

  select pg_get_functiondef('private.require_admin_role(text[])'::regprocedure) into v_definition;
  if v_definition not ilike '%8 hours%'
     or v_definition not ilike '%Admin re-authentication required%'
     or v_definition not ilike '%aal2%' then
    raise exception 'Admin session/MFA boundary drifted';
  end if;
end;
$$;

set local role anon;

do $$
declare
  v_first record;
  v_second record;
begin
  select * into v_first from public.auth_abuse_admit('worker_otp_request','+27820000001','198.51.100.10');
  if not v_first.allowed or v_first.retry_after_seconds <> 0 then
    raise exception 'First OTP request admission should be allowed';
  end if;

  select * into v_second from public.auth_abuse_admit('worker_otp_request','+27820000001','198.51.100.10');
  if v_second.allowed or v_second.retry_after_seconds < 1 then
    raise exception 'Immediate OTP resend should be suppressed by cooldown';
  end if;
end;
$$;

reset role;
rollback;

select '015_auth_session_abuse_controls: PASS' as result;

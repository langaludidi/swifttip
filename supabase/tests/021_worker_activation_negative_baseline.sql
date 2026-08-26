-- SwiftTip MVP v3 — transaction-only Worker activation negative baseline.
--
-- A short-lived test session exists only inside this rolled-back transaction.
-- No legal, provider, Venue, verification or endpoint state is fabricated.

begin;
select set_config('swifttip_test.worker_user_id',(select id::text from auth.users where phone is not null),true);
select set_config('swifttip_test.session_id',gen_random_uuid()::text,true);

insert into auth.sessions(id,user_id,created_at,updated_at,aal,not_after)
values(
  current_setting('swifttip_test.session_id')::uuid,
  current_setting('swifttip_test.worker_user_id')::uuid,
  now(),now(),'aal1',now()+interval '10 minutes'
);

set local role authenticated;

do $$
declare
  v_worker_user_id uuid := current_setting('swifttip_test.worker_user_id')::uuid;
  v_session_id uuid := current_setting('swifttip_test.session_id')::uuid;
  v_ready boolean;
  v_reasons text[];
  v_blocked boolean := false;
  v_error text;
  v_worker_status text;
begin
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub',v_worker_user_id,
      'role','authenticated',
      'aal','aal1',
      'session_id',v_session_id
    )::text,
    true
  );

  select activation_ready,blocking_reasons into strict v_ready,v_reasons
  from public.get_worker_onboarding_state();

  if v_ready then raise exception 'Worker unexpectedly reports activation ready'; end if;
  if not (
    v_reasons @> array[
      'identity_verification',
      'venue_confirmation',
      'settlement_readiness',
      'worker_terms_not_published'
    ]::text[]
    and cardinality(v_reasons)=4
  ) then
    raise exception 'Unexpected activation blockers: %',v_reasons;
  end if;

  begin
    perform public.activate_current_worker();
  exception when others then
    v_blocked := true;
    v_error := sqlerrm;
  end;

  if not v_blocked or v_error not like 'Activation requirements incomplete:%' then
    raise exception 'Activation did not fail through the requirements gate: %',coalesce(v_error,'no error');
  end if;

  select worker_status into strict v_worker_status
  from public.workers where user_id=v_worker_user_id;
  if v_worker_status <> 'draft' then raise exception 'Blocked activation changed Worker status'; end if;
end;
$$;

reset role;

do $$
begin
  if exists(select 1 from public.worker_tipping_endpoints where endpoint_status='active') then
    raise exception 'Blocked activation created an active endpoint';
  end if;
end;
$$;

rollback;
select '021_worker_activation_negative_baseline: PASS' as result;

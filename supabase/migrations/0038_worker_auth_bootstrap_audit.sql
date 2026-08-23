-- SwiftTip MVP v3 — auditable pilot Worker Auth identity bootstrap.
-- This function does not create a Worker record, approve verification, associate a Venue,
-- create a tipping endpoint or activate the Worker. It records only that a pre-authorised
-- Auth phone identity was prepared outside the public self-registration path.

create or replace function public.record_worker_auth_bootstrap(
  p_user_id uuid,
  p_phone text,
  p_auth_user_created boolean
)
returns void
language plpgsql
security definer
set search_path = public, private, audit, auth, pg_temp
as $$
declare
  v_phone text := nullif(trim(p_phone), '');
  v_auth_phone text;
begin
  if current_user <> 'service_role' then
    raise exception 'Service role required';
  end if;

  if p_user_id is null or v_phone is null then
    raise exception 'Auth user and phone are required';
  end if;

  select phone into v_auth_phone
  from auth.users
  where id = p_user_id;

  if v_auth_phone is null then
    raise exception 'Auth user not found or has no phone';
  end if;

  if v_auth_phone <> v_phone then
    raise exception 'Auth user phone does not match bootstrap phone';
  end if;

  if exists(select 1 from public.admin_memberships where user_id = p_user_id and admin_status = 'active') then
    raise exception 'Active SwiftTip Admin identities cannot be bootstrapped as pilot Workers';
  end if;

  insert into audit.audit_events(
    actor_type,
    actor_role,
    action,
    entity_type,
    entity_id,
    resulting_state,
    reason
  ) values (
    'system',
    'bootstrap_provisioner',
    'worker_auth.bootstrap_recorded',
    'auth_user',
    p_user_id,
    jsonb_build_object(
      'phone', v_phone,
      'auth_user_created', p_auth_user_created,
      'worker_record_created', exists(select 1 from public.workers where user_id = p_user_id)
    ),
    'Explicit SwiftTip pilot Worker Auth identity provisioning'
  );
end;
$$;

revoke all on function public.record_worker_auth_bootstrap(uuid,text,boolean) from public;
revoke all on function public.record_worker_auth_bootstrap(uuid,text,boolean) from anon;
revoke all on function public.record_worker_auth_bootstrap(uuid,text,boolean) from authenticated;
grant execute on function public.record_worker_auth_bootstrap(uuid,text,boolean) to service_role;

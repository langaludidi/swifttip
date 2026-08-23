-- SwiftTip MVP v3 — controlled first-Admin/bootstrap membership provisioning.
-- Auth user creation remains in the server-only provisioning script. This function
-- atomically creates/updates the matching Admin membership and its audit event.

create or replace function public.bootstrap_admin_membership(
  p_user_id uuid,
  p_admin_role text,
  p_allow_update boolean default false
)
returns table (
  membership_id uuid,
  user_id uuid,
  admin_role text,
  admin_status text,
  mfa_required boolean
)
language plpgsql
security definer
set search_path = public, auth, audit, pg_temp
as $$
declare
  v_existing public.admin_memberships%rowtype;
  v_result public.admin_memberships%rowtype;
  v_previous jsonb;
begin
  if p_user_id is null then
    raise exception 'Admin user id is required';
  end if;

  if p_admin_role not in ('operations_admin','verification_admin','finance_admin','security_admin','super_admin') then
    raise exception 'Unsupported Admin role';
  end if;

  if not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'Auth user does not exist';
  end if;

  select * into v_existing
  from public.admin_memberships
  where user_id = p_user_id
  for update;

  if found and not p_allow_update then
    raise exception 'Admin membership already exists; explicit update approval is required';
  end if;

  if found then
    v_previous := jsonb_build_object(
      'user_id', v_existing.user_id,
      'admin_role', v_existing.admin_role,
      'admin_status', v_existing.admin_status,
      'mfa_required', v_existing.mfa_required,
      'revoked_at', v_existing.revoked_at
    );

    update public.admin_memberships
    set admin_role = p_admin_role,
        admin_status = 'active',
        mfa_required = true,
        revoked_at = null
    where id = v_existing.id
    returning * into v_result;
  else
    insert into public.admin_memberships (
      user_id,
      admin_role,
      admin_status,
      mfa_required,
      granted_by
    ) values (
      p_user_id,
      p_admin_role,
      'active',
      true,
      null
    )
    returning * into v_result;
  end if;

  insert into audit.audit_events (
    actor_type,
    actor_role,
    action,
    entity_type,
    entity_id,
    previous_state,
    resulting_state,
    reason
  ) values (
    'system',
    'bootstrap_provisioner',
    case when v_existing.id is null then 'admin_membership.bootstrap_created' else 'admin_membership.bootstrap_updated' end,
    'admin_membership',
    v_result.id,
    v_previous,
    jsonb_build_object(
      'user_id', v_result.user_id,
      'admin_role', v_result.admin_role,
      'admin_status', v_result.admin_status,
      'mfa_required', v_result.mfa_required
    ),
    'Explicit server-only SwiftTip Admin provisioning command'
  );

  return query
  select v_result.id, v_result.user_id, v_result.admin_role, v_result.admin_status, v_result.mfa_required;
end;
$$;

revoke all on function public.bootstrap_admin_membership(uuid,text,boolean) from public;
revoke all on function public.bootstrap_admin_membership(uuid,text,boolean) from anon;
revoke all on function public.bootstrap_admin_membership(uuid,text,boolean) from authenticated;
grant execute on function public.bootstrap_admin_membership(uuid,text,boolean) to service_role;

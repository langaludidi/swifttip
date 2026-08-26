-- SwiftTip MVP v3 — non-mutating Admin membership and pre-AAL2 boundary.
--
-- Resolves the controlled test identities before switching to the authenticated
-- role. The transaction is rolled back and creates no session or authority.

begin;
select set_config('swifttip_test.worker_id',(select id::text from auth.users where phone is not null),true);
select set_config('swifttip_test.admin_id',(select id::text from auth.users where email is not null),true);
set local role authenticated;

do $$
declare
  v_worker_user_id uuid := current_setting('swifttip_test.worker_id')::uuid;
  v_admin_user_id uuid := current_setting('swifttip_test.admin_id')::uuid;
  v_visible integer;
  v_role text;
  v_mfa_required boolean;
  v_privileged_blocked boolean := false;
begin
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub',v_worker_user_id,'role','authenticated','aal','aal1')::text,
    true
  );

  select count(*)::integer into v_visible from public.admin_memberships;
  if v_visible <> 0 then raise exception 'Non-Admin identity can see Admin membership rows'; end if;

  select private.current_admin_role() into v_role;
  if v_role is not null then raise exception 'Non-Admin identity resolved an Admin role'; end if;

  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub',v_admin_user_id,'role','authenticated','aal','aal1')::text,
    true
  );

  select count(*)::integer, bool_and(mfa_required)
  into v_visible, v_mfa_required
  from public.admin_memberships;

  if v_visible <> 1 or v_mfa_required is distinct from true then
    raise exception 'Admin self-membership or MFA requirement is not enforced';
  end if;

  select private.current_admin_role() into v_role;
  if v_role <> 'super_admin' then raise exception 'Controlled Admin role did not resolve correctly'; end if;

  begin
    perform public.admin_get_dashboard();
  exception when others then
    v_privileged_blocked := true;
  end;

  if not v_privileged_blocked then
    raise exception 'AAL1/no-fresh-session Admin unexpectedly executed a privileged RPC';
  end if;
end;
$$;

rollback;
select '019_admin_membership_pre_aal2: PASS' as result;

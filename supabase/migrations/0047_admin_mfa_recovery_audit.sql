-- SwiftTip MVP v3 — service-role-only Admin MFA recovery audit event.

create or replace function public.record_admin_mfa_recovery_event(
  p_admin_user_id uuid,
  p_factor_id text,
  p_reason text,
  p_authorised_by text
)
returns void
language plpgsql
security definer
set search_path = public, audit, pg_temp
as $$
begin
  if auth.role() <> 'service_role' then raise exception 'Service role required'; end if;
  if p_admin_user_id is null or not exists(
    select 1 from public.admin_memberships a where a.user_id=p_admin_user_id and a.admin_status='active'
  ) then raise exception 'Active Admin membership required'; end if;
  if length(coalesce(trim(p_factor_id),'')) < 3 then raise exception 'Factor identifier required'; end if;
  if length(coalesce(trim(p_reason),'')) < 10 then raise exception 'Detailed recovery reason required'; end if;
  if length(coalesce(trim(p_authorised_by),'')) < 3 then raise exception 'Recovery authoriser required'; end if;

  insert into audit.audit_events(
    actor_type,actor_role,action,entity_type,entity_id,resulting_state,reason
  ) values (
    'system','security_recovery','admin_mfa_factor_recovered','admin_membership',p_admin_user_id,
    jsonb_build_object('factor_id',trim(p_factor_id),'authorised_by',trim(p_authorised_by),'sessions_expected_revoked',true),
    trim(p_reason)
  );
end;
$$;

revoke all on function public.record_admin_mfa_recovery_event(uuid,text,text,text) from public, anon, authenticated;
grant execute on function public.record_admin_mfa_recovery_event(uuid,text,text,text) to service_role;

-- SwiftTip MVP v3 — Venue-scoped Worker association actions
-- Venue users may confirm employment context; they may not globally activate/suspend a Worker.

create or replace function private.current_venue_role(p_venue_id uuid)
returns text
language sql
stable
security definer
set search_path = public, private
as $$
  select vm.venue_role
  from public.venue_memberships vm
  where vm.user_id = auth.uid()
    and vm.venue_id = p_venue_id
    and vm.membership_status = 'active'
  limit 1;
$$;
revoke all on function private.current_venue_role(uuid) from public;
grant execute on function private.current_venue_role(uuid) to authenticated;

create or replace function public.decide_worker_venue_association(
  p_association_id uuid,
  p_decision text,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public, private, audit
as $$
declare
  v_assoc public.worker_venue_associations;
  v_role text;
  v_previous jsonb;
  v_result jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_decision not in ('confirm','reject') then raise exception 'Invalid association decision'; end if;

  select * into strict v_assoc
  from public.worker_venue_associations
  where id = p_association_id
  for update;

  v_role := private.current_venue_role(v_assoc.venue_id);
  if v_role <> 'venue_admin' then raise exception 'Venue admin access required'; end if;
  if v_assoc.association_status <> 'pending' then raise exception 'Association is not pending'; end if;

  v_previous := jsonb_build_object(
    'association_status', v_assoc.association_status,
    'confirmed_by_user_id', v_assoc.confirmed_by_user_id,
    'confirmed_at', v_assoc.confirmed_at,
    'internal_reason', v_assoc.internal_reason
  );

  if p_decision = 'confirm' then
    update public.worker_venue_associations
    set association_status = 'verified',
        confirmed_by_user_id = auth.uid(),
        confirmed_at = now(),
        started_at = coalesce(started_at, now()),
        internal_reason = null,
        updated_at = now()
    where id = p_association_id;
  else
    if length(coalesce(trim(p_reason), '')) < 3 then raise exception 'Rejection reason required'; end if;
    update public.worker_venue_associations
    set association_status = 'rejected',
        confirmed_by_user_id = auth.uid(),
        confirmed_at = now(),
        internal_reason = trim(p_reason),
        updated_at = now()
    where id = p_association_id;
  end if;

  select jsonb_build_object(
    'association_status', a.association_status,
    'confirmed_by_user_id', a.confirmed_by_user_id,
    'confirmed_at', a.confirmed_at,
    'internal_reason', a.internal_reason
  ) into v_result
  from public.worker_venue_associations a where a.id = p_association_id;

  insert into audit.audit_events(actor_type, actor_user_id, actor_role, action, entity_type, entity_id, previous_state, resulting_state, reason)
  values ('venue_user', auth.uid(), v_role, 'venue_worker_association_' || p_decision, 'worker_venue_association', p_association_id, v_previous, v_result, p_reason);
end;
$$;
revoke all on function public.decide_worker_venue_association(uuid,text,text) from public;
grant execute on function public.decide_worker_venue_association(uuid,text,text) to authenticated;

create or replace function public.end_worker_venue_association(
  p_association_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public, private, audit
as $$
declare
  v_assoc public.worker_venue_associations;
  v_role text;
  v_previous jsonb;
  v_result jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if length(coalesce(trim(p_reason), '')) < 3 then raise exception 'Reason required'; end if;

  select * into strict v_assoc
  from public.worker_venue_associations
  where id = p_association_id
  for update;

  v_role := private.current_venue_role(v_assoc.venue_id);
  if v_role <> 'venue_admin' then raise exception 'Venue admin access required'; end if;
  if v_assoc.association_status not in ('verified','suspended') then raise exception 'Association cannot be ended from current state'; end if;

  v_previous := jsonb_build_object(
    'association_status', v_assoc.association_status,
    'ended_at', v_assoc.ended_at,
    'internal_reason', v_assoc.internal_reason
  );

  update public.worker_venue_associations
  set association_status = 'ended',
      ended_at = now(),
      internal_reason = trim(p_reason),
      updated_at = now()
  where id = p_association_id;

  -- Disable only endpoints tied to this ended Venue association. This is not a global Worker suspension.
  update public.worker_tipping_endpoints
  set endpoint_status = 'disabled', disabled_at = coalesce(disabled_at, now())
  where worker_venue_association_id = p_association_id and endpoint_status = 'active';

  select jsonb_build_object(
    'association_status', a.association_status,
    'ended_at', a.ended_at,
    'internal_reason', a.internal_reason
  ) into v_result
  from public.worker_venue_associations a where a.id = p_association_id;

  insert into audit.audit_events(actor_type, actor_user_id, actor_role, action, entity_type, entity_id, previous_state, resulting_state, reason)
  values ('venue_user', auth.uid(), v_role, 'venue_worker_association_ended', 'worker_venue_association', p_association_id, v_previous, v_result, p_reason);
end;
$$;
revoke all on function public.end_worker_venue_association(uuid,text) from public;
grant execute on function public.end_worker_venue_association(uuid,text) to authenticated;

-- SwiftTip MVP v3 — Worker Venue discovery and association request.
-- Workers may request association only with an active Venue; Venue confirmation remains a separate control.

create or replace function public.list_worker_available_venues(
  p_search text default null,
  p_limit integer default 20
)
returns table (
  venue_id uuid,
  trading_name text,
  branch_name text,
  venue_type text,
  public_location_label text,
  city text,
  province text
)
language plpgsql
stable
security definer
set search_path = public, private
as $$
declare
  v_search text := nullif(trim(p_search), '');
  v_limit integer := greatest(1, least(coalesce(p_limit,20), 50));
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if private.current_worker_id() is null then raise exception 'Worker profile not started'; end if;

  return query
  select v.id, v.trading_name, v.branch_name, v.venue_type,
         v.public_location_label, v.city, v.province
  from public.venues v
  where v.venue_status = 'active'
    and (
      v_search is null
      or v.trading_name ilike '%' || v_search || '%'
      or coalesce(v.branch_name,'') ilike '%' || v_search || '%'
      or coalesce(v.city,'') ilike '%' || v_search || '%'
      or coalesce(v.public_location_label,'') ilike '%' || v_search || '%'
    )
  order by v.trading_name, v.branch_name nulls first
  limit v_limit;
end;
$$;

create or replace function public.request_worker_venue_association(
  p_venue_id uuid,
  p_worker_role text
)
returns uuid
language plpgsql
security definer
set search_path = public, private, audit
as $$
declare
  v_worker_id uuid := private.current_worker_id();
  v_role text := nullif(trim(p_worker_role), '');
  v_assoc_id uuid;
  v_venue_status text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if v_worker_id is null then raise exception 'Worker profile not started'; end if;
  if p_venue_id is null then raise exception 'Venue is required'; end if;
  if v_role is null then raise exception 'Worker role is required'; end if;
  if length(v_role) > 100 then raise exception 'Worker role is too long'; end if;

  select venue_status into v_venue_status
  from public.venues where id = p_venue_id;
  if v_venue_status is null then raise exception 'Venue not found'; end if;
  if v_venue_status <> 'active' then raise exception 'Venue is not available for association'; end if;

  if exists (
    select 1 from public.worker_venue_associations
    where worker_id = v_worker_id
      and association_status = 'verified'
      and ended_at is null
  ) then
    raise exception 'Worker already has a verified Venue association';
  end if;

  select id into v_assoc_id
  from public.worker_venue_associations
  where worker_id = v_worker_id
    and association_status = 'pending'
    and ended_at is null
  order by created_at desc
  limit 1;

  if v_assoc_id is not null then
    if exists (
      select 1 from public.worker_venue_associations
      where id = v_assoc_id and venue_id = p_venue_id
    ) then
      update public.worker_venue_associations
      set worker_role = v_role, updated_at = now()
      where id = v_assoc_id;
      return v_assoc_id;
    end if;
    raise exception 'A Venue confirmation request is already pending';
  end if;

  insert into public.worker_venue_associations (
    worker_id, venue_id, worker_role, association_status
  ) values (
    v_worker_id, p_venue_id, v_role, 'pending'
  ) returning id into v_assoc_id;

  insert into audit.audit_events (
    actor_type, actor_user_id, actor_role, action,
    entity_type, entity_id, resulting_state
  ) values (
    'user', auth.uid(), 'worker', 'worker_venue_association_requested',
    'worker_venue_association', v_assoc_id,
    jsonb_build_object('worker_id',v_worker_id,'venue_id',p_venue_id,'worker_role',v_role,'association_status','pending')
  );

  update public.workers
  set onboarding_status = case when onboarding_status in ('started','phone_verified') then 'verification_pending' else onboarding_status end,
      updated_at = now()
  where id = v_worker_id and worker_status = 'draft';

  return v_assoc_id;
end;
$$;

revoke all on function public.list_worker_available_venues(text,integer) from public, anon;
revoke all on function public.request_worker_venue_association(uuid,text) from public, anon;
grant execute on function public.list_worker_available_venues(text,integer) to authenticated;
grant execute on function public.request_worker_venue_association(uuid,text) to authenticated;

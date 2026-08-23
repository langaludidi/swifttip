-- SwiftTip MVP v3 — Operations projections for Venues and draft-only pilot setup.
-- No function in this migration can activate a pilot cohort.

create or replace function public.admin_get_venues(p_status text default null)
returns table(
  venue_id uuid,
  trading_name text,
  branch_name text,
  venue_type text,
  public_location_label text,
  venue_status text,
  active_member_count bigint,
  verified_worker_count bigint,
  pending_worker_count bigint,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, private
as $$
begin
  perform private.require_admin_role(array['operations_admin','super_admin']);
  return query
  select v.id,v.trading_name,v.branch_name,v.venue_type,v.public_location_label,v.venue_status,
    (select count(*)::bigint from public.venue_memberships vm where vm.venue_id=v.id and vm.membership_status='active'),
    (select count(*)::bigint from public.worker_venue_associations wva where wva.venue_id=v.id and wva.association_status='verified' and wva.ended_at is null),
    (select count(*)::bigint from public.worker_venue_associations wva where wva.venue_id=v.id and wva.association_status='pending' and wva.ended_at is null),
    v.created_at
  from public.venues v
  where nullif(trim(p_status),'') is null or v.venue_status=trim(p_status)
  order by v.created_at desc;
end;
$$;

create or replace function public.admin_get_pilot_cohorts()
returns table(
  pilot_cohort_id uuid,
  name text,
  cohort_status text,
  cohort_type text,
  pricing_version_id uuid,
  pricing_version_code text,
  pricing_status text,
  start_at timestamptz,
  end_at timestamptz,
  venue_count bigint,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, private
as $$
begin
  perform private.require_admin_role(array['operations_admin','finance_admin','super_admin']);
  return query
  select pc.id,pc.name,pc.cohort_status,pc.cohort_type,pc.pricing_version_id,pv.version_code,pv.pricing_status,
         pc.start_at,pc.end_at,count(pcv.id)::bigint,pc.created_at
  from public.pilot_cohorts pc
  join public.pricing_versions pv on pv.id=pc.pricing_version_id
  left join public.pilot_cohort_venues pcv on pcv.pilot_cohort_id=pc.id
  group by pc.id,pv.version_code,pv.pricing_status
  order by pc.created_at desc;
end;
$$;

create or replace function public.admin_create_draft_pilot(
  p_name text,
  p_cohort_type text,
  p_pricing_version_id uuid,
  p_start_at timestamptz default null,
  p_end_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = public, private, audit
as $$
declare
  v_name text := nullif(trim(p_name),'');
  v_id uuid;
begin
  perform private.require_admin_role(array['operations_admin','super_admin']);
  if v_name is null then raise exception 'Pilot name is required'; end if;
  if length(v_name)>160 then raise exception 'Pilot name is too long'; end if;
  if p_start_at is not null and p_end_at is not null and p_end_at<=p_start_at then raise exception 'Pilot end must be after start'; end if;
  if not exists(select 1 from public.pricing_versions where id=p_pricing_version_id) then raise exception 'Pricing version not found'; end if;

  insert into public.pilot_cohorts(name,cohort_status,cohort_type,pricing_version_id,start_at,end_at)
  values(v_name,'draft',nullif(trim(p_cohort_type),''),p_pricing_version_id,p_start_at,p_end_at)
  returning id into v_id;

  insert into audit.audit_events(actor_type,actor_user_id,actor_role,action,entity_type,entity_id,resulting_state)
  values('admin',auth.uid(),private.current_admin_role(),'pilot_draft_created','pilot_cohort',v_id,
         jsonb_build_object('name',v_name,'cohort_status','draft','pricing_version_id',p_pricing_version_id));
  return v_id;
end;
$$;

create or replace function public.admin_add_pilot_venue(p_pilot_cohort_id uuid,p_venue_id uuid)
returns void
language plpgsql
security definer
set search_path = public, private, audit
as $$
declare
  v_status text;
  v_venue_status text;
begin
  perform private.require_admin_role(array['operations_admin','super_admin']);
  select cohort_status into v_status from public.pilot_cohorts where id=p_pilot_cohort_id for update;
  if v_status is null then raise exception 'Pilot cohort not found'; end if;
  if v_status<>'draft' then raise exception 'Venue assignment is locked once a pilot is no longer draft'; end if;
  select venue_status into v_venue_status from public.venues where id=p_venue_id;
  if v_venue_status<>'active' then raise exception 'Only active Venues can be assigned to a pilot'; end if;

  insert into public.pilot_cohort_venues(pilot_cohort_id,venue_id)
  values(p_pilot_cohort_id,p_venue_id)
  on conflict (pilot_cohort_id,venue_id) do nothing;

  insert into audit.audit_events(actor_type,actor_user_id,actor_role,action,entity_type,entity_id,resulting_state)
  values('admin',auth.uid(),private.current_admin_role(),'pilot_venue_added','pilot_cohort',p_pilot_cohort_id,
         jsonb_build_object('venue_id',p_venue_id));
end;
$$;

create or replace function public.admin_remove_pilot_venue(p_pilot_cohort_id uuid,p_venue_id uuid)
returns void
language plpgsql
security definer
set search_path = public, private, audit
as $$
declare
  v_status text;
begin
  perform private.require_admin_role(array['operations_admin','super_admin']);
  select cohort_status into v_status from public.pilot_cohorts where id=p_pilot_cohort_id for update;
  if v_status is null then raise exception 'Pilot cohort not found'; end if;
  if v_status<>'draft' then raise exception 'Venue assignment is locked once a pilot is no longer draft'; end if;
  delete from public.pilot_cohort_venues where pilot_cohort_id=p_pilot_cohort_id and venue_id=p_venue_id;
  insert into audit.audit_events(actor_type,actor_user_id,actor_role,action,entity_type,entity_id,resulting_state)
  values('admin',auth.uid(),private.current_admin_role(),'pilot_venue_removed','pilot_cohort',p_pilot_cohort_id,
         jsonb_build_object('venue_id',p_venue_id));
end;
$$;

revoke all on function public.admin_get_venues(text) from public,anon;
revoke all on function public.admin_get_pilot_cohorts() from public,anon;
revoke all on function public.admin_create_draft_pilot(text,text,uuid,timestamptz,timestamptz) from public,anon;
revoke all on function public.admin_add_pilot_venue(uuid,uuid) from public,anon;
revoke all on function public.admin_remove_pilot_venue(uuid,uuid) from public,anon;
grant execute on function public.admin_get_venues(text) to authenticated;
grant execute on function public.admin_get_pilot_cohorts() to authenticated;
grant execute on function public.admin_create_draft_pilot(text,text,uuid,timestamptz,timestamptz) to authenticated;
grant execute on function public.admin_add_pilot_venue(uuid,uuid) to authenticated;
grant execute on function public.admin_remove_pilot_venue(uuid,uuid) to authenticated;

-- SwiftTip MVP v3 — Venue operational control surface.
-- Adds narrow, audited Admin projections for one Venue and a safe membership
-- revocation action. No Venue, user, Worker or legal record is seeded here.

create or replace function public.admin_get_venue_detail(p_venue_id uuid)
returns table(
  venue_id uuid,
  legal_name text,
  trading_name text,
  branch_name text,
  venue_type text,
  city text,
  province text,
  public_location_label text,
  venue_status text,
  approved_at timestamptz,
  created_at timestamptz,
  active_member_count bigint,
  invited_member_count bigint,
  verified_worker_count bigint,
  pending_worker_count bigint,
  venue_terms_version_code text,
  venue_terms_published boolean
)
language plpgsql
stable
security definer
set search_path = public, private, pg_temp
as $$
begin
  perform private.require_admin_role(array['operations_admin','super_admin']);

  return query
  with current_terms as (
    select tv.version_code
    from public.terms_versions tv
    where tv.terms_type = 'venue_terms'
      and tv.published_at is not null
      and tv.effective_from <= now()
      and (tv.retired_at is null or tv.retired_at > now())
    order by tv.effective_from desc
    limit 1
  )
  select
    v.id,v.legal_name,v.trading_name,v.branch_name,v.venue_type,v.city,v.province,
    v.public_location_label,v.venue_status,v.approved_at,v.created_at,
    (select count(*)::bigint from public.venue_memberships vm where vm.venue_id=v.id and vm.membership_status='active'),
    (select count(*)::bigint from public.venue_memberships vm where vm.venue_id=v.id and vm.membership_status='invited'),
    (select count(*)::bigint from public.worker_venue_associations wva where wva.venue_id=v.id and wva.association_status='verified' and wva.ended_at is null),
    (select count(*)::bigint from public.worker_venue_associations wva where wva.venue_id=v.id and wva.association_status='pending' and wva.ended_at is null),
    ct.version_code,
    (ct.version_code is not null)
  from public.venues v
  left join current_terms ct on true
  where v.id=p_venue_id;
end;
$$;

create or replace function public.admin_get_venue_members(p_venue_id uuid)
returns table(
  membership_id uuid,
  member_email text,
  member_display_name text,
  venue_role text,
  membership_status text,
  invited_at timestamptz,
  accepted_at timestamptz,
  revoked_at timestamptz,
  current_terms_accepted boolean
)
language plpgsql
stable
security definer
set search_path = public, private, auth, pg_temp
as $$
begin
  perform private.require_admin_role(array['operations_admin','super_admin']);
  if not exists(select 1 from public.venues v where v.id=p_venue_id) then raise exception 'Venue not found'; end if;

  return query
  with current_terms as (
    select tv.id
    from public.terms_versions tv
    where tv.terms_type='venue_terms'
      and tv.published_at is not null
      and tv.effective_from<=now()
      and (tv.retired_at is null or tv.retired_at>now())
    order by tv.effective_from desc limit 1
  )
  select vm.id,u.email::text,up.display_name,vm.venue_role,vm.membership_status,
    vm.invited_at,vm.accepted_at,vm.revoked_at,
    exists(select 1 from public.terms_acceptances ta join current_terms ct on ct.id=ta.terms_version_id
      where ta.subject_type='venue_user' and ta.subject_id=vm.id)
  from public.venue_memberships vm
  join auth.users u on u.id=vm.user_id
  left join public.user_profiles up on up.id=vm.user_id
  where vm.venue_id=p_venue_id
  order by case vm.membership_status when 'active' then 0 when 'invited' then 1 else 2 end,vm.invited_at desc;
end;
$$;

create or replace function public.admin_get_venue_worker_associations(p_venue_id uuid)
returns table(
  association_id uuid,
  worker_display_name text,
  worker_role text,
  association_status text,
  worker_status text,
  requested_at timestamptz,
  confirmed_at timestamptz,
  ended_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, private, pg_temp
as $$
begin
  perform private.require_admin_role(array['operations_admin','super_admin']);
  if not exists(select 1 from public.venues v where v.id=p_venue_id) then raise exception 'Venue not found'; end if;

  return query
  select wva.id,w.display_first_name,wva.worker_role,wva.association_status,w.worker_status,
    wva.created_at,wva.confirmed_at,wva.ended_at
  from public.worker_venue_associations wva
  join public.workers w on w.id=wva.worker_id
  where wva.venue_id=p_venue_id
  order by case wva.association_status when 'pending' then 0 when 'verified' then 1 else 2 end,wva.created_at desc;
end;
$$;

create or replace function public.admin_revoke_venue_membership(p_membership_id uuid,p_reason text)
returns void
language plpgsql
security definer
set search_path = public, private, audit, pg_temp
as $$
declare
  v_membership public.venue_memberships;
  v_role text;
  v_reason text := nullif(trim(p_reason),'');
begin
  v_role:=private.require_admin_role(array['operations_admin','super_admin']);
  if length(coalesce(v_reason,''))<3 then raise exception 'A revocation reason is required'; end if;

  select * into strict v_membership from public.venue_memberships where id=p_membership_id for update;
  if v_membership.membership_status='revoked' then return; end if;

  if v_membership.membership_status='active' and v_membership.venue_role='venue_admin' and
    (select count(*) from public.venue_memberships vm where vm.venue_id=v_membership.venue_id and vm.membership_status='active' and vm.venue_role='venue_admin')<=1
  then raise exception 'Add another active Venue admin before revoking the last one'; end if;

  update public.venue_memberships
  set membership_status='revoked',revoked_at=now()
  where id=p_membership_id;

  insert into audit.audit_events(actor_type,actor_user_id,actor_role,action,entity_type,entity_id,previous_state,resulting_state,reason)
  values('admin',auth.uid(),v_role,'venue_membership_revoked','venue_membership',p_membership_id,
    jsonb_build_object('membership_status',v_membership.membership_status,'venue_role',v_membership.venue_role,'venue_id',v_membership.venue_id),
    jsonb_build_object('membership_status','revoked'),v_reason);
end;
$$;

revoke all on function public.admin_get_venue_detail(uuid) from public,anon;
revoke all on function public.admin_get_venue_members(uuid) from public,anon;
revoke all on function public.admin_get_venue_worker_associations(uuid) from public,anon;
revoke all on function public.admin_revoke_venue_membership(uuid,text) from public,anon;
grant execute on function public.admin_get_venue_detail(uuid) to authenticated;
grant execute on function public.admin_get_venue_members(uuid) to authenticated;
grant execute on function public.admin_get_venue_worker_associations(uuid) to authenticated;
grant execute on function public.admin_revoke_venue_membership(uuid,text) to authenticated;

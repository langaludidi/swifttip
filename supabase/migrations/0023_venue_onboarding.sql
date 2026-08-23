-- SwiftTip MVP v3 — controlled Venue onboarding and membership acceptance.
-- Venue users can authenticate and accept an invitation, but cannot create/approve Venues themselves.

create unique index if not exists terms_acceptances_venue_user_once_idx
  on public.terms_acceptances (terms_version_id, subject_id)
  where subject_type = 'venue_user' and subject_id is not null;

create or replace function public.admin_create_venue(
  p_trading_name text,
  p_branch_name text,
  p_venue_type text,
  p_city text default null,
  p_province text default null,
  p_public_location_label text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, private, audit
as $$
declare
  v_name text := nullif(trim(p_trading_name),'');
  v_branch text := nullif(trim(p_branch_name),'');
  v_type text := nullif(trim(p_venue_type),'');
  v_id uuid;
begin
  perform private.require_admin_role(array['operations_admin','super_admin']);
  if v_name is null or v_type is null then raise exception 'Trading name and Venue type are required'; end if;
  if v_type not in ('fuel_station','car_wash','valet','hotel','restaurant','other') then raise exception 'Unsupported Venue type'; end if;
  if length(v_name)>160 or length(coalesce(v_branch,''))>160 then raise exception 'Venue name is too long'; end if;

  insert into public.venues (
    trading_name, branch_name, venue_type, city, province, public_location_label, venue_status
  ) values (
    v_name, v_branch, v_type, nullif(trim(p_city),''), nullif(trim(p_province),''),
    nullif(trim(p_public_location_label),''), 'pending_review'
  ) returning id into v_id;

  insert into audit.audit_events(actor_type,actor_user_id,actor_role,action,entity_type,entity_id,resulting_state)
  values('admin',auth.uid(),private.current_admin_role(),'venue_created','venue',v_id,
    jsonb_build_object('trading_name',v_name,'branch_name',v_branch,'venue_type',v_type,'venue_status','pending_review'));

  return v_id;
end;
$$;

create or replace function public.admin_approve_venue(p_venue_id uuid)
returns void
language plpgsql
security definer
set search_path = public, private, audit
as $$
declare
  v_previous jsonb;
begin
  perform private.require_admin_role(array['operations_admin','super_admin']);
  select jsonb_build_object('venue_status',venue_status) into v_previous
  from public.venues where id=p_venue_id for update;
  if v_previous is null then raise exception 'Venue not found'; end if;

  update public.venues
  set venue_status='active', approved_at=coalesce(approved_at,now()), suspended_at=null, updated_at=now()
  where id=p_venue_id and venue_status in ('draft','pending_review','suspended');

  if not found then raise exception 'Venue cannot be activated from its current state'; end if;

  insert into audit.audit_events(actor_type,actor_user_id,actor_role,action,entity_type,entity_id,previous_state,resulting_state)
  values('admin',auth.uid(),private.current_admin_role(),'venue_approved','venue',p_venue_id,v_previous,jsonb_build_object('venue_status','active'));
end;
$$;

create or replace function public.admin_invite_venue_member(
  p_venue_id uuid,
  p_user_id uuid,
  p_role text default 'venue_admin'
)
returns uuid
language plpgsql
security definer
set search_path = public, private, audit, auth
as $$
declare
  v_membership_id uuid;
  v_venue_status text;
begin
  perform private.require_admin_role(array['operations_admin','super_admin']);
  if p_role not in ('venue_admin','venue_viewer') then raise exception 'Invalid Venue role'; end if;
  if not exists(select 1 from auth.users where id=p_user_id) then raise exception 'Auth user not found'; end if;
  select venue_status into v_venue_status from public.venues where id=p_venue_id;
  if v_venue_status is null then raise exception 'Venue not found'; end if;
  if v_venue_status='closed' then raise exception 'Closed Venue cannot accept invitations'; end if;

  insert into public.venue_memberships(user_id,venue_id,venue_role,membership_status)
  values(p_user_id,p_venue_id,p_role,'invited')
  on conflict (user_id,venue_id) do update
    set venue_role=excluded.venue_role,
        membership_status=case when public.venue_memberships.membership_status='revoked' then 'invited' else public.venue_memberships.membership_status end,
        invited_at=case when public.venue_memberships.membership_status='revoked' then now() else public.venue_memberships.invited_at end,
        revoked_at=case when public.venue_memberships.membership_status='revoked' then null else public.venue_memberships.revoked_at end
  returning id into v_membership_id;

  insert into audit.audit_events(actor_type,actor_user_id,actor_role,action,entity_type,entity_id,resulting_state)
  values('admin',auth.uid(),private.current_admin_role(),'venue_member_invited','venue_membership',v_membership_id,
    jsonb_build_object('venue_id',p_venue_id,'user_id',p_user_id,'venue_role',p_role));

  return v_membership_id;
end;
$$;

create or replace function public.get_my_venue_invitations()
returns table(
  membership_id uuid,
  venue_id uuid,
  venue_name text,
  branch_name text,
  venue_type text,
  public_location_label text,
  venue_status text,
  venue_role text,
  membership_status text,
  venue_terms_version_id uuid,
  venue_terms_version_code text,
  venue_terms_published boolean,
  venue_terms_accepted boolean
)
language plpgsql
stable
security definer
set search_path = public, private
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  return query
  with current_terms as (
    select tv.id,tv.version_code
    from public.terms_versions tv
    where tv.terms_type='venue_terms'
      and tv.published_at is not null
      and tv.effective_from<=now()
      and (tv.retired_at is null or tv.retired_at>now())
    order by tv.effective_from desc limit 1
  )
  select vm.id,v.id,v.trading_name,v.branch_name,v.venue_type,v.public_location_label,v.venue_status,
         vm.venue_role,vm.membership_status,ct.id,ct.version_code,(ct.id is not null),
         exists(select 1 from public.terms_acceptances ta
                where ta.terms_version_id=ct.id and ta.subject_type='venue_user' and ta.subject_id=vm.id)
  from public.venue_memberships vm
  join public.venues v on v.id=vm.venue_id
  left join current_terms ct on true
  where vm.user_id=auth.uid() and vm.membership_status in ('invited','active')
  order by vm.invited_at desc;
end;
$$;

create or replace function public.accept_current_venue_terms(
  p_membership_id uuid,
  p_acceptance_method text default 'checkbox'
)
returns uuid
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_terms_id uuid;
  v_venue_id uuid;
  v_acceptance_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_acceptance_method not in ('checkbox','explicit_button') then raise exception 'Unsupported acceptance method'; end if;
  select venue_id into v_venue_id from public.venue_memberships
  where id=p_membership_id and user_id=auth.uid() and membership_status in ('invited','active');
  if v_venue_id is null then raise exception 'Venue invitation not found'; end if;

  select tv.id into v_terms_id from public.terms_versions tv
  where tv.terms_type='venue_terms'
    and tv.published_at is not null
    and tv.effective_from<=now()
    and (tv.retired_at is null or tv.retired_at>now())
  order by tv.effective_from desc limit 1;
  if v_terms_id is null then raise exception 'Venue terms are not yet published'; end if;

  insert into public.terms_acceptances(terms_version_id,subject_type,subject_id,acceptance_method,evidence_metadata)
  values(v_terms_id,'venue_user',p_membership_id,p_acceptance_method,
    jsonb_build_object('user_id',auth.uid(),'venue_id',v_venue_id,'aal',coalesce(auth.jwt()->>'aal','aal1')))
  on conflict (terms_version_id,subject_id) where subject_type='venue_user' and subject_id is not null
  do update set accepted_at=public.terms_acceptances.accepted_at
  returning id into v_acceptance_id;
  return v_acceptance_id;
end;
$$;

create or replace function public.accept_venue_membership(p_membership_id uuid)
returns void
language plpgsql
security definer
set search_path = public, private, audit
as $$
declare
  v_venue_id uuid;
  v_venue_status text;
  v_terms_id uuid;
  v_previous jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select vm.venue_id,v.venue_status,jsonb_build_object('membership_status',vm.membership_status,'venue_role',vm.venue_role)
  into v_venue_id,v_venue_status,v_previous
  from public.venue_memberships vm join public.venues v on v.id=vm.venue_id
  where vm.id=p_membership_id and vm.user_id=auth.uid() and vm.membership_status='invited'
  for update of vm;
  if v_venue_id is null then raise exception 'Pending Venue invitation not found'; end if;
  if v_venue_status<>'active' then raise exception 'Venue is not active yet'; end if;

  select tv.id into v_terms_id from public.terms_versions tv
  where tv.terms_type='venue_terms' and tv.published_at is not null and tv.effective_from<=now()
    and (tv.retired_at is null or tv.retired_at>now())
  order by tv.effective_from desc limit 1;
  if v_terms_id is null then raise exception 'Venue terms are not yet published'; end if;
  if not exists(select 1 from public.terms_acceptances ta
                where ta.terms_version_id=v_terms_id and ta.subject_type='venue_user' and ta.subject_id=p_membership_id)
  then raise exception 'Current Venue terms must be accepted first'; end if;

  update public.venue_memberships
  set membership_status='active',accepted_at=coalesce(accepted_at,now()),revoked_at=null
  where id=p_membership_id;

  insert into audit.audit_events(actor_type,actor_user_id,actor_role,action,entity_type,entity_id,previous_state,resulting_state)
  values('user',auth.uid(),'venue_user','venue_membership_accepted','venue_membership',p_membership_id,v_previous,
    jsonb_build_object('membership_status','active','venue_id',v_venue_id));
end;
$$;

revoke all on function public.admin_create_venue(text,text,text,text,text,text) from public,anon;
revoke all on function public.admin_approve_venue(uuid) from public,anon;
revoke all on function public.admin_invite_venue_member(uuid,uuid,text) from public,anon;
revoke all on function public.get_my_venue_invitations() from public,anon;
revoke all on function public.accept_current_venue_terms(uuid,text) from public,anon;
revoke all on function public.accept_venue_membership(uuid) from public,anon;
grant execute on function public.admin_create_venue(text,text,text,text,text,text) to authenticated;
grant execute on function public.admin_approve_venue(uuid) to authenticated;
grant execute on function public.admin_invite_venue_member(uuid,uuid,text) to authenticated;
grant execute on function public.get_my_venue_invitations() to authenticated;
grant execute on function public.accept_current_venue_terms(uuid,text) to authenticated;
grant execute on function public.accept_venue_membership(uuid) to authenticated;

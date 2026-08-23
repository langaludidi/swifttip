-- SwiftTip MVP v3 — controlled support-case workflow and narrow audit visibility.

create sequence if not exists public.support_case_reference_seq start 1;

create or replace function private.new_support_case_reference()
returns text
language sql
volatile
security definer
set search_path = public, private
as $$
  select 'ST-SUP-' || to_char(now() at time zone 'Africa/Johannesburg','YY') || '-' || lpad(nextval('public.support_case_reference_seq')::text,6,'0');
$$;

create or replace function public.worker_create_support_case(
  p_category text,
  p_subject text,
  p_description text,
  p_tip_reference text default null
)
returns text
language plpgsql
security definer
set search_path = public, private, audit
as $$
declare
  v_worker_id uuid := private.current_worker_id();
  v_category text := nullif(trim(p_category),'');
  v_subject text := nullif(trim(p_subject),'');
  v_description text := nullif(trim(p_description),'');
  v_tip_id uuid;
  v_case_id uuid;
  v_case_ref text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if v_worker_id is null then raise exception 'Worker profile not found'; end if;
  if v_category is null or v_subject is null or v_description is null then raise exception 'Category, subject and description are required'; end if;
  if length(v_category)>60 or length(v_subject)>160 or length(v_description)>4000 then raise exception 'Support case content is too long'; end if;

  if nullif(trim(p_tip_reference),'') is not null then
    select id into v_tip_id from public.tips
    where swifttip_reference = trim(p_tip_reference) and worker_id = v_worker_id
    limit 1;
    if v_tip_id is null then raise exception 'Tip reference was not found for this Worker'; end if;
  end if;

  v_case_ref := private.new_support_case_reference();
  insert into public.support_cases (
    case_reference, requester_type, requester_user_id, worker_id, tip_id,
    category, subject, description, severity, case_status
  ) values (
    v_case_ref, 'worker', auth.uid(), v_worker_id, v_tip_id,
    v_category, v_subject, v_description, 'normal', 'open'
  ) returning id into v_case_id;

  insert into audit.audit_events (actor_type,actor_user_id,actor_role,action,entity_type,entity_id,resulting_state)
  values ('user',auth.uid(),'worker','support_case_created','support_case',v_case_id,jsonb_build_object('case_reference',v_case_ref,'category',v_category,'case_status','open'));

  return v_case_ref;
end;
$$;

create or replace function public.worker_get_support_cases(p_limit integer default 20)
returns table (
  case_reference text,
  category text,
  subject text,
  case_status text,
  severity text,
  created_at timestamptz,
  resolved_at timestamptz,
  closed_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, private
as $$
declare
  v_worker_id uuid := private.current_worker_id();
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if v_worker_id is null then raise exception 'Worker profile not found'; end if;
  return query
  select s.case_reference,s.category,s.subject,s.case_status,s.severity,s.created_at,s.resolved_at,s.closed_at
  from public.support_cases s where s.worker_id=v_worker_id
  order by s.created_at desc limit greatest(1,least(coalesce(p_limit,20),50));
end;
$$;

create or replace function public.admin_get_support_cases(p_limit integer default 50)
returns table (
  case_id uuid,
  case_reference text,
  requester_type text,
  category text,
  subject text,
  severity text,
  case_status text,
  worker_id uuid,
  venue_id uuid,
  tip_id uuid,
  assigned_admin_user_id uuid,
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
  select s.id,s.case_reference,s.requester_type,s.category,s.subject,s.severity,s.case_status,
         s.worker_id,s.venue_id,s.tip_id,s.assigned_admin_user_id,s.created_at
  from public.support_cases s
  where s.case_status not in ('closed')
  order by case s.severity when 'critical' then 0 when 'high' then 1 when 'normal' then 2 else 3 end,
           s.created_at asc
  limit greatest(1,least(coalesce(p_limit,50),100));
end;
$$;

create or replace function public.admin_update_support_case(
  p_case_id uuid,
  p_status text,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public, private, audit
as $$
declare
  v_previous jsonb;
begin
  perform private.require_admin_role(array['operations_admin','super_admin']);
  if p_status not in ('open','in_progress','awaiting_customer','awaiting_worker','awaiting_provider','resolved','closed') then raise exception 'Invalid support status'; end if;

  select jsonb_build_object('case_status',case_status,'assigned_admin_user_id',assigned_admin_user_id) into v_previous
  from public.support_cases where id=p_case_id for update;
  if v_previous is null then raise exception 'Support case not found'; end if;

  update public.support_cases
  set case_status=p_status,
      assigned_admin_user_id=coalesce(assigned_admin_user_id,auth.uid()),
      resolved_at=case when p_status='resolved' then coalesce(resolved_at,now()) else resolved_at end,
      closed_at=case when p_status='closed' then coalesce(closed_at,now()) else closed_at end
  where id=p_case_id;

  insert into audit.audit_events(actor_type,actor_user_id,actor_role,action,entity_type,entity_id,previous_state,resulting_state,reason)
  values('admin',auth.uid(),private.current_admin_role(),'support_case_status_changed','support_case',p_case_id,v_previous,jsonb_build_object('case_status',p_status,'assigned_admin_user_id',auth.uid()),nullif(trim(p_reason),''));
end;
$$;

create or replace function public.admin_get_audit_events(
  p_limit integer default 50,
  p_entity_type text default null
)
returns table (
  audit_id uuid,
  actor_type text,
  actor_user_id uuid,
  actor_role text,
  action text,
  entity_type text,
  entity_id uuid,
  reason text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, private, audit
as $$
begin
  perform private.require_admin_role(array['security_admin','super_admin']);
  return query
  select a.id,a.actor_type,a.actor_user_id,a.actor_role,a.action,a.entity_type,a.entity_id,a.reason,a.created_at
  from audit.audit_events a
  where nullif(trim(p_entity_type),'') is null or a.entity_type=trim(p_entity_type)
  order by a.created_at desc
  limit greatest(1,least(coalesce(p_limit,50),100));
end;
$$;

revoke all on function private.new_support_case_reference() from public, anon, authenticated;
revoke all on function public.worker_create_support_case(text,text,text,text) from public, anon;
revoke all on function public.worker_get_support_cases(integer) from public, anon;
revoke all on function public.admin_get_support_cases(integer) from public, anon;
revoke all on function public.admin_update_support_case(uuid,text,text) from public, anon;
revoke all on function public.admin_get_audit_events(integer,text) from public, anon;
grant execute on function public.worker_create_support_case(text,text,text,text) to authenticated;
grant execute on function public.worker_get_support_cases(integer) to authenticated;
grant execute on function public.admin_get_support_cases(integer) to authenticated;
grant execute on function public.admin_update_support_case(uuid,text,text) to authenticated;
grant execute on function public.admin_get_audit_events(integer,text) to authenticated;

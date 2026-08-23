-- SwiftTip MVP v3 — controlled legal-document review workflow.
-- This migration creates no published terms and exposes no publish function.

alter table public.terms_versions
  add column if not exists review_status text not null default 'draft',
  add column if not exists review_notes text,
  add column if not exists legal_blockers jsonb not null default '[]'::jsonb,
  add column if not exists submitted_for_review_at timestamptz,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by_user_id uuid references auth.users(id) on delete restrict,
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by_user_id uuid references auth.users(id) on delete restrict,
  add column if not exists updated_at timestamptz not null default now();

alter table public.terms_versions drop constraint if exists terms_versions_review_status_check;
alter table public.terms_versions add constraint terms_versions_review_status_check
  check (review_status in ('draft','under_review','approved'));

alter table public.terms_versions drop constraint if exists terms_versions_legal_blockers_array_check;
alter table public.terms_versions add constraint terms_versions_legal_blockers_array_check
  check (jsonb_typeof(legal_blockers)='array');

alter table public.terms_versions drop constraint if exists terms_versions_publication_requires_approval_check;
alter table public.terms_versions add constraint terms_versions_publication_requires_approval_check
  check (published_at is null or review_status='approved');

create or replace function private.guard_terms_review_workflow()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  new.updated_at := now();

  if new.review_status='approved' then
    if new.title is null or length(trim(new.title))=0 then raise exception 'Approved legal document requires a title'; end if;
    if new.content_body is null or length(trim(new.content_body))=0 then raise exception 'Approved legal document requires content'; end if;
    if jsonb_array_length(new.legal_blockers)<>0 then raise exception 'Legal document cannot be approved while blockers remain'; end if;
    if new.submitted_for_review_at is null then raise exception 'Legal document must be submitted for review before approval'; end if;
  end if;

  if tg_op='UPDATE' and old.review_status='approved' then
    if new.title is distinct from old.title
       or new.content_body is distinct from old.content_body
       or new.content_hash is distinct from old.content_hash
       or new.content_format is distinct from old.content_format
       or new.terms_type is distinct from old.terms_type
       or new.version_code is distinct from old.version_code then
      raise exception 'Approved legal content must be returned to draft before editing';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists guard_terms_review_workflow_trigger on public.terms_versions;
create trigger guard_terms_review_workflow_trigger
before insert or update on public.terms_versions
for each row execute function private.guard_terms_review_workflow();

create or replace function public.admin_get_legal_documents()
returns table(
  terms_version_id uuid,
  terms_type text,
  version_code text,
  title text,
  review_status text,
  blocker_count integer,
  published_at timestamptz,
  effective_from timestamptz,
  submitted_for_review_at timestamptz,
  reviewed_at timestamptz,
  approved_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, private
as $$
begin
  perform private.require_admin_role(array['operations_admin','super_admin']);
  return query
  select tv.id,tv.terms_type,tv.version_code,tv.title,tv.review_status,
         jsonb_array_length(tv.legal_blockers)::integer,tv.published_at,tv.effective_from,
         tv.submitted_for_review_at,tv.reviewed_at,tv.approved_at,tv.updated_at
  from public.terms_versions tv
  order by tv.terms_type,tv.created_at desc;
end;
$$;

create or replace function public.admin_get_legal_document(p_terms_version_id uuid)
returns table(
  terms_version_id uuid,
  terms_type text,
  version_code text,
  title text,
  content_body text,
  content_format text,
  content_hash text,
  review_status text,
  review_notes text,
  legal_blockers jsonb,
  published_at timestamptz,
  effective_from timestamptz,
  submitted_for_review_at timestamptz,
  reviewed_at timestamptz,
  approved_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, private
as $$
begin
  perform private.require_admin_role(array['operations_admin','super_admin']);
  return query
  select tv.id,tv.terms_type,tv.version_code,tv.title,tv.content_body,tv.content_format,tv.content_hash,
         tv.review_status,tv.review_notes,tv.legal_blockers,tv.published_at,tv.effective_from,
         tv.submitted_for_review_at,tv.reviewed_at,tv.approved_at,tv.updated_at
  from public.terms_versions tv where tv.id=p_terms_version_id;
end;
$$;

create or replace function public.admin_update_legal_draft(
  p_terms_version_id uuid,
  p_title text,
  p_content_body text,
  p_legal_blockers jsonb,
  p_review_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public, private, audit
as $$
declare
  v_previous jsonb;
  v_hash text;
begin
  perform private.require_admin_role(array['operations_admin','super_admin']);
  if p_title is null or length(trim(p_title))=0 then raise exception 'Title is required'; end if;
  if p_content_body is null or length(trim(p_content_body))=0 then raise exception 'Content is required'; end if;
  if p_legal_blockers is null or jsonb_typeof(p_legal_blockers)<>'array' then raise exception 'Legal blockers must be a JSON array'; end if;

  select jsonb_build_object('review_status',review_status,'content_hash',content_hash,'blocker_count',jsonb_array_length(legal_blockers))
  into v_previous from public.terms_versions where id=p_terms_version_id for update;
  if v_previous is null then raise exception 'Legal document not found'; end if;
  if (select review_status from public.terms_versions where id=p_terms_version_id)<>'draft' then raise exception 'Only draft legal documents can be edited'; end if;
  if exists(select 1 from public.terms_versions where id=p_terms_version_id and published_at is not null) then raise exception 'Published legal documents cannot be edited'; end if;

  v_hash := encode(digest(convert_to(p_content_body,'UTF8'),'sha256'),'hex');
  update public.terms_versions
  set title=trim(p_title),content_body=p_content_body,content_hash=v_hash,legal_blockers=p_legal_blockers,
      review_notes=nullif(trim(p_review_notes),''),reviewed_at=null,reviewed_by_user_id=null,
      approved_at=null,approved_by_user_id=null
  where id=p_terms_version_id;

  insert into audit.audit_events(actor_type,actor_user_id,actor_role,action,entity_type,entity_id,previous_state,resulting_state,reason)
  values('admin',auth.uid(),private.current_admin_role(),'legal_draft_updated','terms_version',p_terms_version_id,v_previous,
         jsonb_build_object('review_status','draft','content_hash',v_hash,'blocker_count',jsonb_array_length(p_legal_blockers)),nullif(trim(p_review_notes),''));
end;
$$;

create or replace function public.admin_submit_legal_document_for_review(
  p_terms_version_id uuid,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public, private, audit
as $$
declare v_previous jsonb;
begin
  perform private.require_admin_role(array['operations_admin','super_admin']);
  select jsonb_build_object('review_status',review_status,'blocker_count',jsonb_array_length(legal_blockers)) into v_previous
  from public.terms_versions where id=p_terms_version_id for update;
  if v_previous is null then raise exception 'Legal document not found'; end if;
  if (select review_status from public.terms_versions where id=p_terms_version_id)<>'draft' then raise exception 'Only a draft can be submitted for review'; end if;
  if exists(select 1 from public.terms_versions where id=p_terms_version_id and (title is null or content_body is null)) then raise exception 'Draft content is incomplete'; end if;

  update public.terms_versions set review_status='under_review',submitted_for_review_at=now() where id=p_terms_version_id;
  insert into audit.audit_events(actor_type,actor_user_id,actor_role,action,entity_type,entity_id,previous_state,resulting_state,reason)
  values('admin',auth.uid(),private.current_admin_role(),'legal_submitted_for_review','terms_version',p_terms_version_id,v_previous,
         jsonb_build_object('review_status','under_review'),nullif(trim(p_reason),''));
end;
$$;

create or replace function public.admin_record_legal_review(
  p_terms_version_id uuid,
  p_legal_blockers jsonb,
  p_review_notes text
)
returns void
language plpgsql
security definer
set search_path = public, private, audit
as $$
declare v_previous jsonb;
begin
  perform private.require_admin_role(array['super_admin']);
  if p_legal_blockers is null or jsonb_typeof(p_legal_blockers)<>'array' then raise exception 'Legal blockers must be a JSON array'; end if;
  if p_review_notes is null or length(trim(p_review_notes))<3 then raise exception 'Review notes are required'; end if;
  select jsonb_build_object('review_status',review_status,'blocker_count',jsonb_array_length(legal_blockers)) into v_previous
  from public.terms_versions where id=p_terms_version_id for update;
  if v_previous is null then raise exception 'Legal document not found'; end if;
  if (select review_status from public.terms_versions where id=p_terms_version_id)<>'under_review' then raise exception 'Document is not under review'; end if;

  update public.terms_versions
  set legal_blockers=p_legal_blockers,review_notes=trim(p_review_notes),reviewed_at=now(),reviewed_by_user_id=auth.uid()
  where id=p_terms_version_id;
  insert into audit.audit_events(actor_type,actor_user_id,actor_role,action,entity_type,entity_id,previous_state,resulting_state,reason)
  values('admin',auth.uid(),private.current_admin_role(),'legal_review_recorded','terms_version',p_terms_version_id,v_previous,
         jsonb_build_object('review_status','under_review','blocker_count',jsonb_array_length(p_legal_blockers)),trim(p_review_notes));
end;
$$;

create or replace function public.admin_return_legal_document_to_draft(
  p_terms_version_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public, private, audit
as $$
declare v_previous jsonb;
begin
  perform private.require_admin_role(array['super_admin']);
  if p_reason is null or length(trim(p_reason))<3 then raise exception 'Reason is required'; end if;
  select jsonb_build_object('review_status',review_status,'approved_at',approved_at) into v_previous
  from public.terms_versions where id=p_terms_version_id for update;
  if v_previous is null then raise exception 'Legal document not found'; end if;
  if exists(select 1 from public.terms_versions where id=p_terms_version_id and published_at is not null) then raise exception 'Published legal documents cannot return to draft'; end if;
  if (select review_status from public.terms_versions where id=p_terms_version_id)='draft' then raise exception 'Document is already draft'; end if;

  update public.terms_versions
  set review_status='draft',approved_at=null,approved_by_user_id=null,reviewed_at=now(),reviewed_by_user_id=auth.uid()
  where id=p_terms_version_id;
  insert into audit.audit_events(actor_type,actor_user_id,actor_role,action,entity_type,entity_id,previous_state,resulting_state,reason)
  values('admin',auth.uid(),private.current_admin_role(),'legal_returned_to_draft','terms_version',p_terms_version_id,v_previous,
         jsonb_build_object('review_status','draft'),trim(p_reason));
end;
$$;

create or replace function public.admin_approve_legal_document(
  p_terms_version_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public, private, audit
as $$
declare v_previous jsonb; v_blockers integer;
begin
  perform private.require_admin_role(array['super_admin']);
  if p_reason is null or length(trim(p_reason))<3 then raise exception 'Approval reason is required'; end if;
  select jsonb_build_object('review_status',review_status,'blocker_count',jsonb_array_length(legal_blockers)),jsonb_array_length(legal_blockers)
  into v_previous,v_blockers from public.terms_versions where id=p_terms_version_id for update;
  if v_previous is null then raise exception 'Legal document not found'; end if;
  if (select review_status from public.terms_versions where id=p_terms_version_id)<>'under_review' then raise exception 'Only a document under review can be approved'; end if;
  if v_blockers<>0 then raise exception 'Legal blockers must be cleared before approval'; end if;
  if not exists(select 1 from public.terms_versions where id=p_terms_version_id and reviewed_at is not null) then raise exception 'A recorded review is required before approval'; end if;

  update public.terms_versions
  set review_status='approved',approved_at=now(),approved_by_user_id=auth.uid()
  where id=p_terms_version_id;
  insert into audit.audit_events(actor_type,actor_user_id,actor_role,action,entity_type,entity_id,previous_state,resulting_state,reason)
  values('admin',auth.uid(),private.current_admin_role(),'legal_document_approved','terms_version',p_terms_version_id,v_previous,
         jsonb_build_object('review_status','approved','published',false),trim(p_reason));
end;
$$;

revoke all on function private.guard_terms_review_workflow() from public,anon,authenticated;
revoke all on function public.admin_get_legal_documents() from public,anon;
revoke all on function public.admin_get_legal_document(uuid) from public,anon;
revoke all on function public.admin_update_legal_draft(uuid,text,text,jsonb,text) from public,anon;
revoke all on function public.admin_submit_legal_document_for_review(uuid,text) from public,anon;
revoke all on function public.admin_record_legal_review(uuid,jsonb,text) from public,anon;
revoke all on function public.admin_return_legal_document_to_draft(uuid,text) from public,anon;
revoke all on function public.admin_approve_legal_document(uuid,text) from public,anon;

grant execute on function public.admin_get_legal_documents() to authenticated;
grant execute on function public.admin_get_legal_document(uuid) to authenticated;
grant execute on function public.admin_update_legal_draft(uuid,text,text,jsonb,text) to authenticated;
grant execute on function public.admin_submit_legal_document_for_review(uuid,text) to authenticated;
grant execute on function public.admin_record_legal_review(uuid,jsonb,text) to authenticated;
grant execute on function public.admin_return_legal_document_to_draft(uuid,text) to authenticated;
grant execute on function public.admin_approve_legal_document(uuid,text) to authenticated;

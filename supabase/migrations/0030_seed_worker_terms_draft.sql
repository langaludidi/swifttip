-- SwiftTip MVP v3 — legal content hash hardening.
-- pgcrypto is installed in the extensions schema. Qualify digest() explicitly so
-- restricted SECURITY DEFINER search paths cannot break legal-content hashing.

create or replace function private.validate_terms_content()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_hash text;
begin
  if new.title is not null and length(trim(new.title))=0 then raise exception 'Terms title cannot be blank'; end if;
  if new.content_body is not null and length(trim(new.content_body))=0 then raise exception 'Terms content cannot be blank'; end if;

  if new.content_body is not null then
    v_hash := encode(extensions.digest(convert_to(new.content_body,'UTF8'),'sha256'),'hex');
    if new.content_hash <> v_hash then raise exception 'Terms content hash does not match content body'; end if;
  end if;

  if new.published_at is not null then
    if new.title is null or new.content_body is null then raise exception 'Published terms require title and content'; end if;
    if new.effective_from is null then raise exception 'Published terms require an effective date'; end if;
  end if;

  if tg_op='UPDATE' and old.published_at is not null then
    if new.terms_type is distinct from old.terms_type
       or new.version_code is distinct from old.version_code
       or new.title is distinct from old.title
       or new.content_body is distinct from old.content_body
       or new.content_format is distinct from old.content_format
       or new.content_hash is distinct from old.content_hash
       or new.effective_from is distinct from old.effective_from then
      raise exception 'Published terms content is immutable; create a new version instead';
    end if;
  end if;
  return new;
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

  v_hash := encode(extensions.digest(convert_to(p_content_body,'UTF8'),'sha256'),'hex');
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

revoke all on function private.validate_terms_content() from public,anon,authenticated;
revoke all on function public.admin_update_legal_draft(uuid,text,text,jsonb,text) from public,anon;
grant execute on function public.admin_update_legal_draft(uuid,text,text,jsonb,text) to authenticated;

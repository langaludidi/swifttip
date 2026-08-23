-- SwiftTip MVP v3 — Worker identity-evidence storage hardening.
-- Evidence remains separate from payment-provider KYC / Settlement destination evidence.

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('worker-verification','worker-verification',false,10485760,array['image/jpeg','image/png','application/pdf']::text[])
on conflict (id) do update
set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

alter table private.verification_documents
  add column if not exists storage_object_id uuid,
  add column if not exists storage_object_version text;

alter table private.verification_documents drop constraint if exists verification_documents_file_size_bytes_check;
alter table private.verification_documents
  add constraint verification_documents_file_size_bytes_check check (file_size_bytes > 0 and file_size_bytes <= 10485760),
  add constraint verification_documents_mime_type_check check (mime_type in ('image/jpeg','image/png','application/pdf')),
  add constraint verification_documents_document_type_check check (document_type='identity_evidence'),
  add constraint verification_documents_sha256_hash_check check (sha256_hash ~ '^[0-9a-f]{64}$');

alter table private.verification_documents
  alter column sha256_hash set not null,
  alter column storage_object_id set not null;

create unique index if not exists verification_documents_storage_path_uidx on private.verification_documents(storage_path);
create unique index if not exists verification_documents_storage_object_uidx on private.verification_documents(storage_object_id);
create index if not exists verification_documents_verification_active_idx on private.verification_documents(verification_id,uploaded_at) where deleted_at is null;

create or replace function private.protect_verification_document_metadata()
returns trigger language plpgsql set search_path=public,private as $$
begin
  if new.verification_id is distinct from old.verification_id
     or new.storage_path is distinct from old.storage_path
     or new.storage_object_id is distinct from old.storage_object_id
     or new.storage_object_version is distinct from old.storage_object_version
     or new.document_type is distinct from old.document_type
     or new.mime_type is distinct from old.mime_type
     or new.file_size_bytes is distinct from old.file_size_bytes
     or new.sha256_hash is distinct from old.sha256_hash
     or new.uploaded_at is distinct from old.uploaded_at then
    raise exception 'Verification evidence metadata is immutable';
  end if;
  if old.deleted_at is not null and new.deleted_at is distinct from old.deleted_at then
    raise exception 'Deleted verification evidence cannot be restored or re-dated';
  end if;
  return new;
end;$$;
revoke all on function private.protect_verification_document_metadata() from public,anon,authenticated;
drop trigger if exists protect_verification_document_metadata on private.verification_documents;
create trigger protect_verification_document_metadata before update on private.verification_documents for each row execute function private.protect_verification_document_metadata();

create or replace function private.verification_path_belongs_to_current_worker(p_name text)
returns boolean language plpgsql stable security definer set search_path=public,private,storage as $$
declare v_worker_id uuid; v_folders text[];
begin
  v_worker_id:=private.current_worker_id(); if v_worker_id is null then return false; end if;
  v_folders:=storage.foldername(p_name);
  if coalesce(array_length(v_folders,1),0)<>2 or v_folders[1]<>v_worker_id::text then return false; end if;
  return exists(select 1 from public.worker_verifications wv where wv.worker_id=v_worker_id and wv.id::text=v_folders[2]);
end;$$;

create or replace function private.verification_path_is_mutable_for_current_worker(p_name text)
returns boolean language plpgsql stable security definer set search_path=public,private,storage as $$
declare v_worker_id uuid; v_folders text[];
begin
  v_worker_id:=private.current_worker_id(); if v_worker_id is null then return false; end if;
  v_folders:=storage.foldername(p_name);
  if coalesce(array_length(v_folders,1),0)<>2 or v_folders[1]<>v_worker_id::text then return false; end if;
  return exists(select 1 from public.worker_verifications wv where wv.worker_id=v_worker_id and wv.id::text=v_folders[2] and wv.verification_status in ('not_started','additional_info_required'));
end;$$;

create or replace function private.verification_object_is_active_registered(p_name text)
returns boolean language sql stable security definer set search_path=public,private as $$
  select exists(select 1 from private.verification_documents vd where vd.storage_path=p_name and vd.deleted_at is null);
$$;
revoke all on function private.verification_path_belongs_to_current_worker(text) from public,anon;
revoke all on function private.verification_path_is_mutable_for_current_worker(text) from public,anon;
revoke all on function private.verification_object_is_active_registered(text) from public,anon;
grant execute on function private.verification_path_belongs_to_current_worker(text) to authenticated;
grant execute on function private.verification_path_is_mutable_for_current_worker(text) to authenticated;
grant execute on function private.verification_object_is_active_registered(text) to authenticated;

drop policy if exists worker_verification_evidence_insert on storage.objects;
create policy worker_verification_evidence_insert on storage.objects for insert to authenticated
with check (bucket_id='worker-verification' and private.verification_path_is_mutable_for_current_worker(name));

drop policy if exists worker_verification_evidence_read on storage.objects;
create policy worker_verification_evidence_read on storage.objects for select to authenticated
using (bucket_id='worker-verification' and private.verification_object_is_active_registered(name) and (private.verification_path_belongs_to_current_worker(name) or (coalesce(auth.jwt()->>'aal','aal1')='aal2' and private.current_admin_role() in ('verification_admin','super_admin'))));

drop policy if exists worker_verification_evidence_delete on storage.objects;
create policy worker_verification_evidence_delete on storage.objects for delete to authenticated
using (bucket_id='worker-verification' and private.verification_path_is_mutable_for_current_worker(name));

create or replace function public.register_worker_verification_document(p_verification_id uuid,p_storage_path text,p_document_type text,p_mime_type text,p_file_size_bytes bigint,p_sha256_hash text default null)
returns uuid language plpgsql security definer set search_path=public,private,audit,storage as $$
declare
  v_worker_id uuid; v_verification public.worker_verifications; v_document_id uuid;
  v_object_id uuid; v_object_version text; v_object_metadata jsonb; v_active_document_count integer;
begin
  v_worker_id:=private.current_worker_id(); if v_worker_id is null then raise exception 'Worker access required'; end if;
  select * into strict v_verification from public.worker_verifications where id=p_verification_id and worker_id=v_worker_id for update;
  if v_verification.verification_status not in ('not_started','additional_info_required') then raise exception 'Verification evidence cannot be changed in current state'; end if;
  if not private.verification_path_is_mutable_for_current_worker(p_storage_path) then raise exception 'Evidence path is outside the editable Worker verification scope'; end if;
  if trim(coalesce(p_document_type,''))<>'identity_evidence' then raise exception 'Unsupported verification document type'; end if;
  if p_mime_type not in ('image/jpeg','image/png','application/pdf') then raise exception 'Unsupported evidence file type'; end if;
  if p_file_size_bytes<=0 or p_file_size_bytes>10485760 then raise exception 'Evidence file size outside allowed range'; end if;
  if coalesce(lower(trim(p_sha256_hash)),'') !~ '^[0-9a-f]{64}$' then raise exception 'A valid SHA-256 evidence fingerprint is required'; end if;

  select o.id,o.version,o.metadata into v_object_id,v_object_version,v_object_metadata
  from storage.objects o where o.bucket_id='worker-verification' and o.name=p_storage_path
    and (o.owner=auth.uid() or o.owner_id=auth.uid()::text)
    and o.archived_at is null and coalesce(o.is_delete_marker,false)=false limit 1;
  if v_object_id is null then raise exception 'Verification evidence object does not exist or is not owned by this Worker'; end if;
  if v_object_metadata ? 'mimetype' and coalesce(v_object_metadata->>'mimetype','')<>p_mime_type then raise exception 'Evidence MIME metadata does not match the registered file'; end if;
  if v_object_metadata ? 'size' and coalesce(v_object_metadata->>'size','') ~ '^[0-9]+$' and (v_object_metadata->>'size')::bigint<>p_file_size_bytes then raise exception 'Evidence size metadata does not match the registered file'; end if;

  select count(*)::integer into v_active_document_count from private.verification_documents vd where vd.verification_id=p_verification_id and vd.deleted_at is null;
  if v_active_document_count>=5 then raise exception 'A maximum of five active evidence files is allowed per verification'; end if;
  if exists(select 1 from private.verification_documents vd where vd.storage_path=p_storage_path or vd.storage_object_id=v_object_id) then raise exception 'Verification evidence object is already registered'; end if;

  insert into private.verification_documents(verification_id,storage_path,storage_object_id,storage_object_version,document_type,mime_type,file_size_bytes,sha256_hash)
  values(p_verification_id,p_storage_path,v_object_id,v_object_version,'identity_evidence',p_mime_type,p_file_size_bytes,lower(trim(p_sha256_hash))) returning id into v_document_id;
  insert into audit.audit_events(actor_type,actor_user_id,action,entity_type,entity_id,resulting_state)
  values('worker',auth.uid(),'verification_document_registered','verification_document',v_document_id,jsonb_build_object('verification_id',p_verification_id,'document_type','identity_evidence','mime_type',p_mime_type,'file_size_bytes',p_file_size_bytes));
  return v_document_id;
end;$$;
revoke all on function public.register_worker_verification_document(uuid,text,text,text,bigint,text) from public,anon;
grant execute on function public.register_worker_verification_document(uuid,text,text,text,bigint,text) to authenticated;

create or replace function public.get_worker_verification_documents(p_verification_id uuid)
returns table(document_id uuid,storage_path text,document_type text,mime_type text,file_size_bytes bigint,uploaded_at timestamptz,storage_object_available boolean)
language plpgsql stable security definer set search_path=public,private,storage as $$
declare v_worker_id uuid;
begin
  v_worker_id:=private.current_worker_id(); if v_worker_id is null then raise exception 'Worker access required'; end if;
  if not exists(select 1 from public.worker_verifications wv where wv.id=p_verification_id and wv.worker_id=v_worker_id) then raise exception 'Verification not found'; end if;
  return query select vd.id,vd.storage_path,vd.document_type,vd.mime_type,vd.file_size_bytes,vd.uploaded_at,
    exists(select 1 from storage.objects o where o.bucket_id='worker-verification' and o.name=vd.storage_path and o.id=vd.storage_object_id and o.archived_at is null and coalesce(o.is_delete_marker,false)=false)
  from private.verification_documents vd where vd.verification_id=p_verification_id and vd.deleted_at is null order by vd.uploaded_at;
end;$$;
revoke all on function public.get_worker_verification_documents(uuid) from public,anon;
grant execute on function public.get_worker_verification_documents(uuid) to authenticated;

create or replace function public.prepare_worker_verification_document_removal(p_document_id uuid)
returns text language plpgsql stable security definer set search_path=public,private as $$
declare v_worker_id uuid; v_path text;
begin
  v_worker_id:=private.current_worker_id(); if v_worker_id is null then raise exception 'Worker access required'; end if;
  select vd.storage_path into strict v_path from private.verification_documents vd join public.worker_verifications wv on wv.id=vd.verification_id
  where vd.id=p_document_id and vd.deleted_at is null and wv.worker_id=v_worker_id and wv.verification_status in ('not_started','additional_info_required');
  return v_path;
end;$$;
revoke all on function public.prepare_worker_verification_document_removal(uuid) from public,anon;
grant execute on function public.prepare_worker_verification_document_removal(uuid) to authenticated;

create or replace function public.finalize_worker_verification_document_removal(p_document_id uuid)
returns void language plpgsql security definer set search_path=public,private,audit,storage as $$
declare v_worker_id uuid; v_document private.verification_documents; v_verification public.worker_verifications;
begin
  v_worker_id:=private.current_worker_id(); if v_worker_id is null then raise exception 'Worker access required'; end if;
  select vd.* into strict v_document from private.verification_documents vd join public.worker_verifications wv on wv.id=vd.verification_id where vd.id=p_document_id and wv.worker_id=v_worker_id for update of vd;
  select * into strict v_verification from public.worker_verifications where id=v_document.verification_id and worker_id=v_worker_id for update;
  if v_document.deleted_at is not null then return; end if;
  if v_verification.verification_status not in ('not_started','additional_info_required') then raise exception 'Verification evidence cannot be removed in current state'; end if;
  if exists(select 1 from storage.objects o where o.bucket_id='worker-verification' and o.name=v_document.storage_path and o.id=v_document.storage_object_id and o.archived_at is null and coalesce(o.is_delete_marker,false)=false) then raise exception 'Storage evidence must be deleted before metadata removal is finalised'; end if;
  update private.verification_documents set deleted_at=now() where id=v_document.id;
  insert into audit.audit_events(actor_type,actor_user_id,action,entity_type,entity_id,previous_state,resulting_state)
  values('worker',auth.uid(),'verification_document_removed','verification_document',v_document.id,jsonb_build_object('deleted_at',null),jsonb_build_object('deleted_at','recorded'));
end;$$;
revoke all on function public.finalize_worker_verification_document_removal(uuid) from public,anon;
grant execute on function public.finalize_worker_verification_document_removal(uuid) to authenticated;

create or replace function public.submit_worker_verification(p_verification_id uuid)
returns void language plpgsql security definer set search_path=public,private,audit,storage as $$
declare v_worker_id uuid; v_verification public.worker_verifications;
begin
  v_worker_id:=private.current_worker_id(); if v_worker_id is null then raise exception 'Worker access required'; end if;
  select * into strict v_verification from public.worker_verifications where id=p_verification_id and worker_id=v_worker_id for update;
  if v_verification.verification_status not in ('not_started','additional_info_required') then raise exception 'Verification cannot be submitted in current state'; end if;
  if not exists(select 1 from private.verification_documents vd join storage.objects o on o.bucket_id='worker-verification' and o.name=vd.storage_path and o.id=vd.storage_object_id and o.archived_at is null and coalesce(o.is_delete_marker,false)=false where vd.verification_id=p_verification_id and vd.deleted_at is null) then raise exception 'At least one available registered verification document is required'; end if;
  if exists(select 1 from private.verification_documents vd where vd.verification_id=p_verification_id and vd.deleted_at is null and not exists(select 1 from storage.objects o where o.bucket_id='worker-verification' and o.name=vd.storage_path and o.id=vd.storage_object_id and o.archived_at is null and coalesce(o.is_delete_marker,false)=false)) then raise exception 'Verification evidence is incomplete; remove or re-upload missing evidence before submission'; end if;
  update public.worker_verifications set verification_status='submitted',submitted_at=now(),decision_reason=null where id=p_verification_id;
  update public.workers set onboarding_status='verification_pending',updated_at=now() where id=v_worker_id and onboarding_status in ('started','phone_verified','verification_pending');
  insert into audit.audit_events(actor_type,actor_user_id,action,entity_type,entity_id,previous_state,resulting_state)
  values('worker',auth.uid(),'worker_verification_submitted','worker_verification',p_verification_id,jsonb_build_object('verification_status',v_verification.verification_status),jsonb_build_object('verification_status','submitted'));
end;$$;
revoke all on function public.submit_worker_verification(uuid) from public,anon;
grant execute on function public.submit_worker_verification(uuid) to authenticated;

create or replace function public.admin_decide_worker_verification(p_verification_id uuid,p_decision text,p_reason text default null)
returns void language plpgsql security definer set search_path=public,private,audit,storage as $$
declare v_role text; v_verification public.worker_verifications; v_target_status text;
begin
  v_role:=private.require_admin_role(array['verification_admin','super_admin']);
  if p_decision not in ('approve','request_more_information','reject') then raise exception 'Invalid verification decision'; end if;
  if p_decision<>'approve' and length(coalesce(trim(p_reason),''))<3 then raise exception 'Decision reason required'; end if;
  select * into strict v_verification from public.worker_verifications where id=p_verification_id for update;
  if v_verification.verification_status not in ('submitted','under_review') then raise exception 'Verification is not awaiting a review decision'; end if;
  if p_decision='approve' then
    if not exists(select 1 from private.verification_documents vd join storage.objects o on o.bucket_id='worker-verification' and o.name=vd.storage_path and o.id=vd.storage_object_id and o.archived_at is null and coalesce(o.is_delete_marker,false)=false where vd.verification_id=p_verification_id and vd.deleted_at is null) then raise exception 'Approval requires available registered identity evidence'; end if;
    if exists(select 1 from private.verification_documents vd where vd.verification_id=p_verification_id and vd.deleted_at is null and not exists(select 1 from storage.objects o where o.bucket_id='worker-verification' and o.name=vd.storage_path and o.id=vd.storage_object_id and o.archived_at is null and coalesce(o.is_delete_marker,false)=false)) then raise exception 'Approval blocked because registered evidence is missing from Storage'; end if;
  end if;
  v_target_status:=case p_decision when 'approve' then 'approved' when 'request_more_information' then 'additional_info_required' else 'rejected' end;
  update public.worker_verifications set verification_status=v_target_status,reviewed_at=now(),reviewed_by=auth.uid(),decision_reason=nullif(trim(p_reason),'') where id=p_verification_id;
  if p_decision='approve' then update public.workers set onboarding_status='settlement_pending',updated_at=now() where id=v_verification.worker_id and onboarding_status='verification_pending';
  elsif p_decision='request_more_information' then update public.workers set onboarding_status='verification_pending',updated_at=now() where id=v_verification.worker_id;
  else update public.workers set onboarding_status='blocked',updated_at=now() where id=v_verification.worker_id; end if;
  insert into audit.audit_events(actor_type,actor_user_id,actor_role,action,entity_type,entity_id,previous_state,resulting_state,reason)
  values('admin',auth.uid(),v_role,'worker_verification_'||p_decision,'worker_verification',p_verification_id,jsonb_build_object('verification_status',v_verification.verification_status),jsonb_build_object('verification_status',v_target_status),p_reason);
end;$$;
revoke all on function public.admin_decide_worker_verification(uuid,text,text) from public,anon;
grant execute on function public.admin_decide_worker_verification(uuid,text,text) to authenticated;

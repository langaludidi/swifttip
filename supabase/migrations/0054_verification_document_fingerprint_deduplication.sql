-- Prevent retries of the same file from consuming the identity-evidence allowance.
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
  if p_document_type not in ('identity_document','live_selfie') then raise exception 'Unsupported verification document type'; end if;
  if p_mime_type not in ('image/jpeg','image/png','application/pdf') then raise exception 'Unsupported evidence file type'; end if;
  if p_document_type='live_selfie' and p_mime_type='application/pdf' then raise exception 'A live selfie must be a JPG or PNG image'; end if;
  if p_file_size_bytes<=0 or p_file_size_bytes>10485760 then raise exception 'Evidence file size outside allowed range'; end if;
  if coalesce(lower(trim(p_sha256_hash)),'') !~ '^[0-9a-f]{64}$' then raise exception 'A valid SHA-256 evidence fingerprint is required'; end if;
  select o.id,o.version,o.metadata into v_object_id,v_object_version,v_object_metadata from storage.objects o
  where o.bucket_id='worker-verification' and o.name=p_storage_path and (o.owner=auth.uid() or o.owner_id=auth.uid()::text)
    and o.archived_at is null and coalesce(o.is_delete_marker,false)=false limit 1;
  if v_object_id is null then raise exception 'Verification evidence object does not exist or is not owned by this Worker'; end if;
  if v_object_metadata ? 'mimetype' and coalesce(v_object_metadata->>'mimetype','')<>p_mime_type then raise exception 'Evidence MIME metadata does not match the registered file'; end if;
  if v_object_metadata ? 'size' and coalesce(v_object_metadata->>'size','') ~ '^[0-9]+$' and (v_object_metadata->>'size')::bigint<>p_file_size_bytes then raise exception 'Evidence size metadata does not match the registered file'; end if;
  if exists(
    select 1 from private.verification_documents
    where verification_id=p_verification_id
      and sha256_hash=lower(trim(p_sha256_hash))
      and deleted_at is null
  ) then raise exception 'This file is already registered for this verification'; end if;
  if p_document_type='live_selfie' and exists(select 1 from private.verification_documents where verification_id=p_verification_id and document_type='live_selfie' and deleted_at is null) then raise exception 'A live selfie is already registered'; end if;
  if p_document_type='identity_document' then
    select count(*)::integer into v_active_document_count from private.verification_documents where verification_id=p_verification_id and document_type in ('identity_document','identity_evidence') and deleted_at is null;
    if v_active_document_count>=5 then raise exception 'A maximum of five identity-document files is allowed'; end if;
  end if;
  if exists(select 1 from private.verification_documents where storage_path=p_storage_path or storage_object_id=v_object_id) then raise exception 'Verification evidence object is already registered'; end if;
  insert into private.verification_documents(verification_id,storage_path,storage_object_id,storage_object_version,document_type,mime_type,file_size_bytes,sha256_hash)
  values(p_verification_id,p_storage_path,v_object_id,v_object_version,p_document_type,p_mime_type,p_file_size_bytes,lower(trim(p_sha256_hash))) returning id into v_document_id;
  insert into audit.audit_events(actor_type,actor_user_id,action,entity_type,entity_id,resulting_state)
  values('worker',auth.uid(),'verification_document_registered','verification_document',v_document_id,jsonb_build_object('verification_id',p_verification_id,'document_type',p_document_type,'mime_type',p_mime_type,'file_size_bytes',p_file_size_bytes));
  return v_document_id;
end;
$$;
revoke all on function public.register_worker_verification_document(uuid,text,text,text,bigint,text) from public,anon;
grant execute on function public.register_worker_verification_document(uuid,text,text,text,bigint,text) to authenticated;

-- SwiftTip MVP v3 — Worker verification evidence and review workflow

-- Private evidence bucket. Provider settlement/KYC evidence remains provider-owned and
-- is deliberately not duplicated here.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'worker-verification',
  'worker-verification',
  false,
  10485760,
  array['image/jpeg','image/png','application/pdf']::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Workers may upload/read only inside their own top-level folder. Verification and
-- Super Admins may read evidence for review. There is intentionally no direct client
-- update/delete policy for evidence objects.
drop policy if exists worker_verification_evidence_insert on storage.objects;
create policy worker_verification_evidence_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'worker-verification'
  and (storage.foldername(name))[1] = private.current_worker_id()::text
);

drop policy if exists worker_verification_evidence_read on storage.objects;
create policy worker_verification_evidence_read on storage.objects
for select to authenticated
using (
  bucket_id = 'worker-verification'
  and (
    (storage.foldername(name))[1] = private.current_worker_id()::text
    or private.current_admin_role() in ('verification_admin','super_admin')
  )
);

create or replace function public.start_worker_verification(p_verification_type text default 'identity')
returns uuid
language plpgsql
security definer
set search_path = public, private, audit
as $$
declare
  v_worker_id uuid;
  v_existing uuid;
  v_id uuid;
begin
  v_worker_id := private.current_worker_id();
  if v_worker_id is null then raise exception 'Worker access required'; end if;
  if p_verification_type <> 'identity' then raise exception 'Unsupported verification type'; end if;

  select wv.id into v_existing
  from public.worker_verifications wv
  where wv.worker_id = v_worker_id
    and wv.verification_type = p_verification_type
    and wv.verification_status in ('not_started','submitted','under_review','additional_info_required','approved')
  order by wv.created_at desc
  limit 1;

  if v_existing is not null then return v_existing; end if;

  insert into public.worker_verifications(worker_id, verification_type, verification_status)
  values (v_worker_id, p_verification_type, 'not_started')
  returning id into v_id;

  insert into audit.audit_events(actor_type, actor_user_id, action, entity_type, entity_id, resulting_state)
  values ('worker', auth.uid(), 'worker_verification_started', 'worker_verification', v_id,
          jsonb_build_object('verification_status','not_started','verification_type',p_verification_type));

  return v_id;
end;
$$;
revoke all on function public.start_worker_verification(text) from public, anon;
grant execute on function public.start_worker_verification(text) to authenticated;

create or replace function public.register_worker_verification_document(
  p_verification_id uuid,
  p_storage_path text,
  p_document_type text,
  p_mime_type text,
  p_file_size_bytes bigint,
  p_sha256_hash text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, private, audit
as $$
declare
  v_worker_id uuid;
  v_verification public.worker_verifications;
  v_document_id uuid;
begin
  v_worker_id := private.current_worker_id();
  if v_worker_id is null then raise exception 'Worker access required'; end if;

  select * into strict v_verification
  from public.worker_verifications
  where id = p_verification_id and worker_id = v_worker_id
  for update;

  if v_verification.verification_status not in ('not_started','additional_info_required') then
    raise exception 'Verification evidence cannot be changed in current state';
  end if;
  if p_mime_type not in ('image/jpeg','image/png','application/pdf') then
    raise exception 'Unsupported evidence file type';
  end if;
  if p_file_size_bytes <= 0 or p_file_size_bytes > 10485760 then
    raise exception 'Evidence file size outside allowed range';
  end if;
  if position(v_worker_id::text || '/' || p_verification_id::text || '/' in p_storage_path) <> 1 then
    raise exception 'Evidence path is outside Worker verification scope';
  end if;

  insert into private.verification_documents(
    verification_id, storage_path, document_type, mime_type,
    file_size_bytes, sha256_hash
  ) values (
    p_verification_id, p_storage_path, trim(p_document_type), p_mime_type,
    p_file_size_bytes, nullif(trim(p_sha256_hash),'')
  ) returning id into v_document_id;

  insert into audit.audit_events(actor_type, actor_user_id, action, entity_type, entity_id, resulting_state)
  values ('worker', auth.uid(), 'verification_document_registered', 'verification_document', v_document_id,
          jsonb_build_object('verification_id',p_verification_id,'document_type',p_document_type,'mime_type',p_mime_type,'file_size_bytes',p_file_size_bytes));

  return v_document_id;
end;
$$;
revoke all on function public.register_worker_verification_document(uuid,text,text,text,bigint,text) from public, anon;
grant execute on function public.register_worker_verification_document(uuid,text,text,text,bigint,text) to authenticated;

create or replace function public.submit_worker_verification(p_verification_id uuid)
returns void
language plpgsql
security definer
set search_path = public, private, audit
as $$
declare
  v_worker_id uuid;
  v_verification public.worker_verifications;
begin
  v_worker_id := private.current_worker_id();
  if v_worker_id is null then raise exception 'Worker access required'; end if;

  select * into strict v_verification
  from public.worker_verifications
  where id = p_verification_id and worker_id = v_worker_id
  for update;

  if v_verification.verification_status not in ('not_started','additional_info_required') then
    raise exception 'Verification cannot be submitted in current state';
  end if;
  if not exists (
    select 1 from private.verification_documents vd
    where vd.verification_id = p_verification_id and vd.deleted_at is null
  ) then
    raise exception 'At least one verification document is required';
  end if;

  update public.worker_verifications
  set verification_status = 'submitted', submitted_at = now(), decision_reason = null
  where id = p_verification_id;

  update public.workers
  set onboarding_status = 'verification_pending', updated_at = now()
  where id = v_worker_id and onboarding_status in ('started','phone_verified','verification_pending');

  insert into audit.audit_events(actor_type, actor_user_id, action, entity_type, entity_id, previous_state, resulting_state)
  values ('worker', auth.uid(), 'worker_verification_submitted', 'worker_verification', p_verification_id,
          jsonb_build_object('verification_status',v_verification.verification_status),
          jsonb_build_object('verification_status','submitted'));
end;
$$;
revoke all on function public.submit_worker_verification(uuid) from public, anon;
grant execute on function public.submit_worker_verification(uuid) to authenticated;

create or replace function public.admin_decide_worker_verification(
  p_verification_id uuid,
  p_decision text,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public, private, audit
as $$
declare
  v_role text;
  v_verification public.worker_verifications;
  v_target_status text;
begin
  v_role := private.require_admin_role(array['verification_admin','super_admin']);
  if p_decision not in ('approve','request_more_information','reject') then
    raise exception 'Invalid verification decision';
  end if;
  if p_decision <> 'approve' and length(coalesce(trim(p_reason),'')) < 3 then
    raise exception 'Decision reason required';
  end if;

  select * into strict v_verification
  from public.worker_verifications
  where id = p_verification_id
  for update;

  if v_verification.verification_status not in ('submitted','under_review') then
    raise exception 'Verification is not awaiting a review decision';
  end if;

  v_target_status := case p_decision
    when 'approve' then 'approved'
    when 'request_more_information' then 'additional_info_required'
    else 'rejected'
  end;

  update public.worker_verifications
  set verification_status = v_target_status,
      reviewed_at = now(),
      reviewed_by = auth.uid(),
      decision_reason = nullif(trim(p_reason),'')
  where id = p_verification_id;

  if p_decision = 'approve' then
    update public.workers
    set onboarding_status = 'settlement_pending', updated_at = now()
    where id = v_verification.worker_id and onboarding_status = 'verification_pending';
  elsif p_decision = 'request_more_information' then
    update public.workers
    set onboarding_status = 'verification_pending', updated_at = now()
    where id = v_verification.worker_id;
  else
    update public.workers
    set onboarding_status = 'blocked', updated_at = now()
    where id = v_verification.worker_id;
  end if;

  insert into audit.audit_events(actor_type, actor_user_id, actor_role, action, entity_type, entity_id, previous_state, resulting_state, reason)
  values ('admin', auth.uid(), v_role, 'worker_verification_' || p_decision, 'worker_verification', p_verification_id,
          jsonb_build_object('verification_status',v_verification.verification_status),
          jsonb_build_object('verification_status',v_target_status), p_reason);
end;
$$;
revoke all on function public.admin_decide_worker_verification(uuid,text,text) from public, anon;
grant execute on function public.admin_decide_worker_verification(uuid,text,text) to authenticated;

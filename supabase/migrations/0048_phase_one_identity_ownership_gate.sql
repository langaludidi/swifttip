-- SwiftTip MVP v3 — Phase 1 identity ownership gate.
-- Raw identity numbers are never persisted. A keyed HMAC supports duplicate
-- detection while the final four digits support a narrow manual-review cue.

create table if not exists private.identity_hash_secrets (
  singleton boolean primary key default true check (singleton),
  secret bytea not null,
  created_at timestamptz not null default now()
);

insert into private.identity_hash_secrets(singleton, secret)
values (true, extensions.gen_random_bytes(32))
on conflict (singleton) do nothing;

revoke all on private.identity_hash_secrets from public, anon, authenticated;

create table if not exists private.worker_identity_claims (
  worker_id uuid primary key references public.workers(id) on delete restrict,
  document_type text not null check (document_type in ('sa_smart_id','sa_green_id','passport')),
  identity_number_hash bytea not null unique,
  identity_number_last4 text not null check (identity_number_last4 ~ '^[0-9A-Z]{4}$'),
  consent_version text not null,
  consented_at timestamptz not null,
  selfie_capture_attested boolean not null default false,
  selfie_capture_method text check (selfie_capture_method in ('browser_camera','camera_file_fallback')),
  selfie_captured_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

revoke all on private.worker_identity_claims from public, anon, authenticated;

alter table private.verification_documents drop constraint if exists verification_documents_document_type_check;
alter table private.verification_documents
  add constraint verification_documents_document_type_check
  check (document_type in ('identity_evidence','identity_document','live_selfie'));

create unique index if not exists one_active_live_selfie_per_verification_idx
  on private.verification_documents(verification_id)
  where document_type='live_selfie' and deleted_at is null;

create or replace function private.normalize_identity_number(p_value text)
returns text language sql immutable set search_path='' as $$
  select upper(regexp_replace(trim(coalesce(p_value,'')), '[^0-9A-Za-z]', '', 'g'));
$$;

create or replace function private.valid_sa_identity_number(p_value text)
returns boolean language plpgsql immutable set search_path='' as $$
declare
  v text := regexp_replace(coalesce(p_value,''), '[^0-9]', '', 'g');
  v_total integer := 0;
  v_digit integer;
  i integer;
begin
  if v !~ '^[0-9]{13}$' then return false; end if;
  begin
    if to_char(to_date(substr(v,1,6),'YYMMDD'),'YYMMDD') <> substr(v,1,6) then return false; end if;
  exception when others then return false;
  end;
  for i in 1..13 loop
    v_digit := substr(v,i,1)::integer;
    if mod(13-i,2)=1 then
      v_digit := v_digit * 2;
      if v_digit > 9 then v_digit := v_digit - 9; end if;
    end if;
    v_total := v_total + v_digit;
  end loop;
  return mod(v_total,10)=0;
end;
$$;

revoke all on function private.normalize_identity_number(text) from public, anon, authenticated;
revoke all on function private.valid_sa_identity_number(text) from public, anon, authenticated;

create or replace function public.save_worker_identity_claim(
  p_legal_first_name text,
  p_legal_last_name text,
  p_document_type text,
  p_identity_number text,
  p_consent_version text
)
returns void language plpgsql security definer
set search_path=public,private,audit,extensions as $$
declare
  v_worker_id uuid;
  v_verification public.worker_verifications;
  v_normalized text;
  v_hash bytea;
  v_secret bytea;
  v_first text := regexp_replace(trim(coalesce(p_legal_first_name,'')), '\s+', ' ', 'g');
  v_last text := regexp_replace(trim(coalesce(p_legal_last_name,'')), '\s+', ' ', 'g');
begin
  v_worker_id:=private.current_worker_id();
  if v_worker_id is null then raise exception 'Worker access required'; end if;
  if length(v_first) not between 2 and 80 or length(v_last) not between 2 and 80 then
    raise exception 'Enter the legal names shown on the identity document';
  end if;
  if p_document_type not in ('sa_smart_id','sa_green_id','passport') then raise exception 'Unsupported identity document type'; end if;
  if trim(coalesce(p_consent_version,'')) <> 'identity-pilot-v1' then raise exception 'Current identity consent is required'; end if;

  select * into v_verification from public.worker_verifications
  where worker_id=v_worker_id and verification_type='identity'
    and verification_status in ('not_started','additional_info_required')
  order by created_at desc limit 1 for update;
  if v_verification.id is null then raise exception 'Start identity verification before saving identity details'; end if;

  v_normalized:=private.normalize_identity_number(p_identity_number);
  if p_document_type in ('sa_smart_id','sa_green_id') and not private.valid_sa_identity_number(v_normalized) then
    raise exception 'Enter a valid 13-digit South African identity number';
  end if;
  if p_document_type='passport' and v_normalized !~ '^[0-9A-Z]{6,20}$' then raise exception 'Enter a valid passport number'; end if;

  select secret into strict v_secret from private.identity_hash_secrets where singleton=true;
  v_hash:=extensions.hmac(convert_to(v_normalized,'UTF8'),v_secret,'sha256');
  if exists(select 1 from private.worker_identity_claims c where c.identity_number_hash=v_hash and c.worker_id<>v_worker_id) then
    raise exception 'This identity is already connected to another SwiftTip Worker account';
  end if;

  update public.workers set legal_first_name=v_first,legal_last_name=v_last,updated_at=now() where id=v_worker_id;
  insert into private.worker_identity_claims(worker_id,document_type,identity_number_hash,identity_number_last4,consent_version,consented_at)
  values(v_worker_id,p_document_type,v_hash,right(v_normalized,4),'identity-pilot-v1',now())
  on conflict(worker_id) do update set
    document_type=excluded.document_type,
    identity_number_hash=excluded.identity_number_hash,
    identity_number_last4=excluded.identity_number_last4,
    consent_version=excluded.consent_version,
    consented_at=excluded.consented_at,
    updated_at=now();

  insert into audit.audit_events(actor_type,actor_user_id,action,entity_type,entity_id,resulting_state)
  values('worker',auth.uid(),'worker_identity_claim_saved','worker',v_worker_id,
    jsonb_build_object('document_type',p_document_type,'identity_last4',right(v_normalized,4),'consent_version','identity-pilot-v1'));
end;
$$;
revoke all on function public.save_worker_identity_claim(text,text,text,text,text) from public,anon;
grant execute on function public.save_worker_identity_claim(text,text,text,text,text) to authenticated;

create or replace function public.get_worker_identity_claim()
returns table(document_type text,identity_number_last4 text,consent_version text,consented_at timestamptz,selfie_capture_attested boolean,selfie_capture_method text,selfie_captured_at timestamptz)
language plpgsql stable security definer set search_path=public,private as $$
declare v_worker_id uuid;
begin
  v_worker_id:=private.current_worker_id(); if v_worker_id is null then raise exception 'Worker access required'; end if;
  return query select c.document_type,c.identity_number_last4,c.consent_version,c.consented_at,c.selfie_capture_attested,c.selfie_capture_method,c.selfie_captured_at
  from private.worker_identity_claims c where c.worker_id=v_worker_id;
end;
$$;
revoke all on function public.get_worker_identity_claim() from public,anon;
grant execute on function public.get_worker_identity_claim() to authenticated;

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

create or replace function public.attest_worker_live_selfie(p_verification_id uuid,p_capture_method text)
returns void language plpgsql security definer set search_path=public,private,audit as $$
declare v_worker_id uuid;
begin
  v_worker_id:=private.current_worker_id(); if v_worker_id is null then raise exception 'Worker access required'; end if;
  if p_capture_method not in ('browser_camera','camera_file_fallback') then raise exception 'Unsupported selfie capture method'; end if;
  if not exists(select 1 from public.worker_verifications where id=p_verification_id and worker_id=v_worker_id and verification_status in ('not_started','additional_info_required')) then raise exception 'Verification is not editable'; end if;
  if not exists(select 1 from private.verification_documents where verification_id=p_verification_id and document_type='live_selfie' and deleted_at is null) then raise exception 'A registered live selfie is required'; end if;
  update private.worker_identity_claims set selfie_capture_attested=true,selfie_capture_method=p_capture_method,selfie_captured_at=now(),updated_at=now() where worker_id=v_worker_id;
  if not found then raise exception 'Save identity details and consent before capturing a selfie'; end if;
  insert into audit.audit_events(actor_type,actor_user_id,action,entity_type,entity_id,resulting_state)
  values('worker',auth.uid(),'worker_live_selfie_attested','worker_verification',p_verification_id,jsonb_build_object('capture_method',p_capture_method));
end;
$$;
revoke all on function public.attest_worker_live_selfie(uuid,text) from public,anon;
grant execute on function public.attest_worker_live_selfie(uuid,text) to authenticated;

create or replace function public.submit_worker_verification(p_verification_id uuid)
returns void language plpgsql security definer set search_path=public,private,audit,storage as $$
declare v_worker_id uuid; v_verification public.worker_verifications;
begin
  v_worker_id:=private.current_worker_id(); if v_worker_id is null then raise exception 'Worker access required'; end if;
  select * into strict v_verification from public.worker_verifications where id=p_verification_id and worker_id=v_worker_id for update;
  if v_verification.verification_status not in ('not_started','additional_info_required') then raise exception 'Verification cannot be submitted in current state'; end if;
  if not exists(select 1 from private.worker_identity_claims where worker_id=v_worker_id and consent_version='identity-pilot-v1' and selfie_capture_attested) then raise exception 'Identity details, consent and a live selfie are required'; end if;
  if not exists(select 1 from private.verification_documents vd join storage.objects o on o.bucket_id='worker-verification' and o.name=vd.storage_path and o.id=vd.storage_object_id and o.archived_at is null and coalesce(o.is_delete_marker,false)=false where vd.verification_id=p_verification_id and vd.deleted_at is null and vd.document_type in ('identity_document','identity_evidence')) then raise exception 'An available identity document is required'; end if;
  if not exists(select 1 from private.verification_documents vd join storage.objects o on o.bucket_id='worker-verification' and o.name=vd.storage_path and o.id=vd.storage_object_id and o.archived_at is null and coalesce(o.is_delete_marker,false)=false where vd.verification_id=p_verification_id and vd.deleted_at is null and vd.document_type='live_selfie') then raise exception 'An available live selfie is required'; end if;
  if exists(select 1 from private.verification_documents vd where vd.verification_id=p_verification_id and vd.deleted_at is null and not exists(select 1 from storage.objects o where o.bucket_id='worker-verification' and o.name=vd.storage_path and o.id=vd.storage_object_id and o.archived_at is null and coalesce(o.is_delete_marker,false)=false)) then raise exception 'Verification evidence is incomplete'; end if;
  update public.worker_verifications set verification_status='submitted',submitted_at=now(),decision_reason=null where id=p_verification_id;
  update public.workers set onboarding_status='verification_pending',updated_at=now() where id=v_worker_id and onboarding_status in ('started','phone_verified','verification_pending');
  insert into audit.audit_events(actor_type,actor_user_id,action,entity_type,entity_id,previous_state,resulting_state)
  values('worker',auth.uid(),'worker_verification_submitted','worker_verification',p_verification_id,jsonb_build_object('verification_status',v_verification.verification_status),jsonb_build_object('verification_status','submitted','phase_one_identity_gate',true));
end;
$$;
revoke all on function public.submit_worker_verification(uuid) from public,anon;
grant execute on function public.submit_worker_verification(uuid) to authenticated;

drop function if exists public.admin_get_verification_detail(uuid);
create function public.admin_get_verification_detail(p_verification_id uuid)
returns table (
  verification_id uuid,worker_id uuid,legal_first_name text,legal_last_name text,display_name text,
  verification_type text,verification_status text,submitted_at timestamptz,reviewed_at timestamptz,decision_reason text,venue_name text,
  identity_document_type text,identity_number_last4 text,identity_consented_at timestamptz,selfie_capture_method text,selfie_captured_at timestamptz,
  document_id uuid,storage_path text,document_type text,mime_type text,file_size_bytes bigint,uploaded_at timestamptz,storage_object_available boolean
)
language plpgsql stable security definer set search_path=public,private,storage as $$
begin
  perform private.require_admin_role(array['verification_admin','super_admin']);
  return query select wv.id,w.id,w.legal_first_name,w.legal_last_name,w.display_first_name,wv.verification_type,wv.verification_status,wv.submitted_at,wv.reviewed_at,wv.decision_reason,
    coalesce(v.branch_name,v.trading_name),c.document_type,c.identity_number_last4,c.consented_at,c.selfie_capture_method,c.selfie_captured_at,
    vd.id,vd.storage_path,vd.document_type,vd.mime_type,vd.file_size_bytes,vd.uploaded_at,
    case when vd.id is null then null else exists(select 1 from storage.objects o where o.bucket_id='worker-verification' and o.name=vd.storage_path and o.id=vd.storage_object_id and o.archived_at is null and coalesce(o.is_delete_marker,false)=false) end
  from public.worker_verifications wv join public.workers w on w.id=wv.worker_id
  left join private.worker_identity_claims c on c.worker_id=w.id
  left join public.worker_venue_associations a on a.worker_id=w.id and a.ended_at is null
  left join public.venues v on v.id=a.venue_id
  left join private.verification_documents vd on vd.verification_id=wv.id and vd.deleted_at is null
  where wv.id=p_verification_id order by case vd.document_type when 'identity_document' then 1 when 'identity_evidence' then 1 when 'live_selfie' then 2 else 3 end,vd.uploaded_at nulls last;
end;
$$;
revoke all on function public.admin_get_verification_detail(uuid) from public,anon;
grant execute on function public.admin_get_verification_detail(uuid) to authenticated;

create or replace function public.admin_decide_worker_identity_verification(
  p_verification_id uuid,p_decision text,p_reason text default null,
  p_document_matches boolean default false,p_selfie_matches boolean default false,p_duplicate_clear boolean default false
)
returns void language plpgsql security definer set search_path=public,private,audit,storage as $$
declare v_role text; v_verification public.worker_verifications; v_target_status text;
begin
  v_role:=private.require_admin_role(array['verification_admin','super_admin']);
  if p_decision not in ('approve','request_more_information','reject') then raise exception 'Invalid verification decision'; end if;
  if p_decision<>'approve' and length(coalesce(trim(p_reason),''))<3 then raise exception 'Decision reason required'; end if;
  select * into strict v_verification from public.worker_verifications where id=p_verification_id and verification_type='identity' for update;
  if v_verification.verification_status not in ('submitted','under_review') then raise exception 'Verification is not awaiting a review decision'; end if;
  if p_decision='approve' then
    if not (p_document_matches and p_selfie_matches and p_duplicate_clear) then raise exception 'All Phase 1 reviewer confirmations are required'; end if;
    if not exists(select 1 from private.worker_identity_claims where worker_id=v_verification.worker_id and consent_version='identity-pilot-v1' and selfie_capture_attested) then raise exception 'Identity claim, consent or selfie attestation is incomplete'; end if;
    if not exists(select 1 from private.verification_documents vd join storage.objects o on o.bucket_id='worker-verification' and o.name=vd.storage_path and o.id=vd.storage_object_id and o.archived_at is null and coalesce(o.is_delete_marker,false)=false where vd.verification_id=p_verification_id and vd.deleted_at is null and vd.document_type in ('identity_document','identity_evidence')) then raise exception 'Approval requires an identity document'; end if;
    if not exists(select 1 from private.verification_documents vd join storage.objects o on o.bucket_id='worker-verification' and o.name=vd.storage_path and o.id=vd.storage_object_id and o.archived_at is null and coalesce(o.is_delete_marker,false)=false where vd.verification_id=p_verification_id and vd.deleted_at is null and vd.document_type='live_selfie') then raise exception 'Approval requires a live selfie'; end if;
  end if;
  v_target_status:=case p_decision when 'approve' then 'approved' when 'request_more_information' then 'additional_info_required' else 'rejected' end;
  update public.worker_verifications set verification_status=v_target_status,reviewed_at=now(),reviewed_by=auth.uid(),decision_reason=nullif(trim(p_reason),'') where id=p_verification_id;
  if p_decision='approve' then update public.workers set onboarding_status='settlement_pending',updated_at=now() where id=v_verification.worker_id and onboarding_status='verification_pending';
  elsif p_decision='request_more_information' then update public.workers set onboarding_status='verification_pending',updated_at=now() where id=v_verification.worker_id;
  else update public.workers set onboarding_status='blocked',updated_at=now() where id=v_verification.worker_id; end if;
  insert into audit.audit_events(actor_type,actor_user_id,actor_role,action,entity_type,entity_id,previous_state,resulting_state,reason)
  values('admin',auth.uid(),v_role,'worker_verification_'||p_decision,'worker_verification',p_verification_id,jsonb_build_object('verification_status',v_verification.verification_status),jsonb_build_object('verification_status',v_target_status,'document_matches',p_document_matches,'selfie_matches',p_selfie_matches,'duplicate_clear',p_duplicate_clear),p_reason);
end;
$$;
revoke all on function public.admin_decide_worker_identity_verification(uuid,text,text,boolean,boolean,boolean) from public,anon;
grant execute on function public.admin_decide_worker_identity_verification(uuid,text,text,boolean,boolean,boolean) to authenticated;

-- SwiftTip MVP v3 — regression checks for migration 0044.

do $$
declare
  v_public boolean;
  v_limit bigint;
  v_mimes text[];
  v_policy_count integer;
  v_policy text;
begin
  select public,file_size_limit,allowed_mime_types into v_public,v_limit,v_mimes
  from storage.buckets where id='worker-verification';
  if v_public is distinct from false then raise exception 'worker-verification bucket must remain private'; end if;
  if v_limit<>10485760 then raise exception 'worker-verification bucket limit must be 10MB'; end if;
  if not (v_mimes @> array['image/jpeg','image/png','application/pdf']::text[] and cardinality(v_mimes)=3) then raise exception 'worker-verification MIME allowlist drifted'; end if;

  select count(*) into v_policy_count from pg_policies
  where schemaname='storage' and tablename='objects' and policyname like 'worker_verification_evidence_%';
  if v_policy_count<>3 then raise exception 'Expected exactly 3 Worker verification Storage policies, found %',v_policy_count; end if;
  if exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname like 'worker_verification_evidence_%' and cmd='UPDATE') then raise exception 'Verification evidence must not have an UPDATE/overwrite policy'; end if;
  if exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname like 'worker_verification_evidence_%' and 'anon'=any(roles)) then raise exception 'Anonymous role must have no verification evidence Storage policy'; end if;

  select coalesce(with_check,'') into v_policy from pg_policies where schemaname='storage' and tablename='objects' and policyname='worker_verification_evidence_insert';
  if position('verification_path_is_mutable_for_current_worker' in v_policy)=0 then raise exception 'Insert policy is not bound to an editable Worker verification'; end if;

  select coalesce(qual,'') into v_policy from pg_policies where schemaname='storage' and tablename='objects' and policyname='worker_verification_evidence_read';
  if position('verification_object_is_active_registered' in v_policy)=0 then raise exception 'Read policy does not require registered evidence'; end if;
  if position('aal2' in v_policy)=0 or position('verification_admin' in v_policy)=0 or position('super_admin' in v_policy)=0 then raise exception 'Admin evidence read policy does not require AAL2 verification roles'; end if;

  select coalesce(qual,'') into v_policy from pg_policies where schemaname='storage' and tablename='objects' and policyname='worker_verification_evidence_delete';
  if position('verification_path_is_mutable_for_current_worker' in v_policy)=0 then raise exception 'Delete policy is not restricted to editable Worker verification'; end if;

  if (select is_nullable from information_schema.columns where table_schema='private' and table_name='verification_documents' and column_name='storage_object_id')<>'NO' then raise exception 'storage_object_id must be NOT NULL'; end if;
  if (select is_nullable from information_schema.columns where table_schema='private' and table_name='verification_documents' and column_name='sha256_hash')<>'NO' then raise exception 'sha256_hash must be NOT NULL'; end if;
  if not exists(select 1 from information_schema.columns where table_schema='private' and table_name='verification_documents' and column_name='storage_object_version') then raise exception 'storage_object_version column missing'; end if;

  if not exists(select 1 from pg_indexes where schemaname='private' and tablename='verification_documents' and indexname='verification_documents_storage_path_uidx' and indexdef ilike '%unique%') then raise exception 'Unique evidence path index missing'; end if;
  if not exists(select 1 from pg_indexes where schemaname='private' and tablename='verification_documents' and indexname='verification_documents_storage_object_uidx' and indexdef ilike '%unique%') then raise exception 'Unique Storage object index missing'; end if;

  if not exists(select 1 from pg_constraint where conrelid='private.verification_documents'::regclass and conname='verification_documents_file_size_bytes_check' and pg_get_constraintdef(oid) like '%10485760%') then raise exception 'Evidence size constraint missing'; end if;
  if not exists(select 1 from pg_constraint where conrelid='private.verification_documents'::regclass and conname='verification_documents_mime_type_check') then raise exception 'Evidence MIME constraint missing'; end if;
  if not exists(select 1 from pg_constraint where conrelid='private.verification_documents'::regclass and conname='verification_documents_document_type_check') then raise exception 'Evidence document type constraint missing'; end if;
  if not exists(select 1 from pg_constraint where conrelid='private.verification_documents'::regclass and conname='verification_documents_sha256_hash_check') then raise exception 'Evidence SHA-256 constraint missing'; end if;

  if not exists(select 1 from pg_trigger where tgrelid='private.verification_documents'::regclass and tgname='protect_verification_document_metadata' and not tgisinternal) then raise exception 'Verification evidence immutability trigger missing'; end if;

  if has_function_privilege('anon','public.register_worker_verification_document(uuid,text,text,text,bigint,text)','EXECUTE') then raise exception 'anon can register verification evidence'; end if;
  if has_function_privilege('anon','public.get_worker_verification_documents(uuid)','EXECUTE') then raise exception 'anon can inspect Worker evidence metadata'; end if;
  if has_function_privilege('anon','public.prepare_worker_verification_document_removal(uuid)','EXECUTE') then raise exception 'anon can prepare evidence removal'; end if;
  if has_function_privilege('anon','public.finalize_worker_verification_document_removal(uuid)','EXECUTE') then raise exception 'anon can finalise evidence removal'; end if;
  if has_function_privilege('anon','public.submit_worker_verification(uuid)','EXECUTE') then raise exception 'anon can submit Worker verification'; end if;
  if has_function_privilege('anon','public.admin_decide_worker_verification(uuid,text,text)','EXECUTE') then raise exception 'anon can decide Worker verification'; end if;

  if not has_function_privilege('authenticated','public.register_worker_verification_document(uuid,text,text,text,bigint,text)','EXECUTE') then raise exception 'authenticated Worker evidence registration RPC unavailable'; end if;
  if not has_function_privilege('authenticated','public.get_worker_verification_documents(uuid)','EXECUTE') then raise exception 'authenticated Worker evidence metadata RPC unavailable'; end if;
  if not has_function_privilege('authenticated','public.prepare_worker_verification_document_removal(uuid)','EXECUTE') then raise exception 'authenticated Worker evidence removal preparation RPC unavailable'; end if;
  if not has_function_privilege('authenticated','public.finalize_worker_verification_document_removal(uuid)','EXECUTE') then raise exception 'authenticated Worker evidence removal finalisation RPC unavailable'; end if;

  if not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='submit_worker_verification' and pg_get_functiondef(p.oid) like '%storage.objects%') then raise exception 'Verification submission no longer checks physical Storage evidence'; end if;
  if not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='admin_decide_worker_verification' and pg_get_functiondef(p.oid) like '%Approval requires available registered identity evidence%') then raise exception 'Admin approval no longer checks evidence availability'; end if;
end;
$$;

select '012_verification_evidence_storage_hardening: PASS' as result;

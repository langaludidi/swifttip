-- SwiftTip MVP v3 — legal draft, publication and ACL assertions.

do $$
declare
  v_count integer;
  v_bad integer;
begin
  select count(*) into v_count
  from public.terms_versions
  where version_code='v0.1-draft'
    and terms_type in ('worker_terms','venue_terms','customer_transaction_terms','privacy_notice');
  if v_count<>4 then raise exception 'Expected exactly four v0.1 legal drafts, found %',v_count; end if;

  select count(*) into v_bad
  from public.terms_versions
  where version_code='v0.1-draft'
    and (
      review_status<>'draft'
      or published_at is not null
      or effective_from<'2099-01-01T00:00:00Z'::timestamptz
      or title is null or length(trim(title))=0
      or content_body is null or length(trim(content_body))=0
      or content_hash is null
      or content_hash<>encode(extensions.digest(convert_to(content_body,'UTF8'),'sha256'),'hex')
      or jsonb_typeof(legal_blockers)<>'array'
      or jsonb_array_length(legal_blockers)=0
    );
  if v_bad<>0 then raise exception 'One or more legal drafts violates draft integrity controls'; end if;

  if exists(select 1 from public.terms_versions where published_at is not null) then
    raise exception 'A legal document was published unexpectedly';
  end if;
  if exists(select 1 from public.terms_versions where review_status<>'draft') then
    raise exception 'A legal draft moved out of draft status unexpectedly';
  end if;

  if has_table_privilege('anon','public.terms_versions','SELECT')
     or has_table_privilege('anon','public.terms_versions','INSERT')
     or has_table_privilege('anon','public.terms_versions','UPDATE') then
    raise exception 'Anonymous role has direct legal table privileges';
  end if;
  if has_table_privilege('authenticated','public.terms_versions','SELECT')
     or has_table_privilege('authenticated','public.terms_versions','INSERT')
     or has_table_privilege('authenticated','public.terms_versions','UPDATE') then
    raise exception 'Authenticated role has direct legal table privileges';
  end if;

  if not has_function_privilege('anon','public.get_effective_terms(text)','EXECUTE') then
    raise exception 'Narrow public effective-terms reader is unavailable';
  end if;

  if exists(
    select 1 from pg_proc
    where pronamespace='public'::regnamespace
      and (proname like 'admin_publish%' or proname like '%publish_legal%' or proname='publish_terms')
  ) then
    raise exception 'Unexpected legal publication RPC exists';
  end if;

  if has_function_privilege('anon','public.admin_get_legal_documents()','EXECUTE')
     or has_function_privilege('anon','public.admin_get_legal_document(uuid)','EXECUTE')
     or has_function_privilege('anon','public.admin_update_legal_draft(uuid,text,text,jsonb,text)','EXECUTE')
     or has_function_privilege('anon','public.admin_submit_legal_document_for_review(uuid,text)','EXECUTE')
     or has_function_privilege('anon','public.admin_record_legal_review(uuid,jsonb,text)','EXECUTE')
     or has_function_privilege('anon','public.admin_return_legal_document_to_draft(uuid,text)','EXECUTE')
     or has_function_privilege('anon','public.admin_approve_legal_document(uuid,text)','EXECUTE') then
    raise exception 'Anonymous role can execute a legal Admin RPC';
  end if;

  if has_function_privilege('authenticated','private.validate_terms_content()','EXECUTE')
     or has_function_privilege('authenticated','private.guard_terms_review_workflow()','EXECUTE') then
    raise exception 'Authenticated role can execute private legal guards';
  end if;

  select count(*) into v_count from public.pricing_versions where pricing_status='active';
  if v_count<>0 then raise exception 'Pricing activated unexpectedly'; end if;
  select count(*) into v_count from public.workers where worker_status='active';
  if v_count<>0 then raise exception 'Worker activated unexpectedly'; end if;
  select count(*) into v_count from public.venues where venue_status='active';
  if v_count<>0 then raise exception 'Venue activated unexpectedly'; end if;
  select count(*) into v_count from public.worker_tipping_endpoints where endpoint_status='active';
  if v_count<>0 then raise exception 'Tipping endpoint activated unexpectedly'; end if;
  select count(*) into v_count from public.pilot_cohorts where cohort_status='active';
  if v_count<>0 then raise exception 'Pilot activated unexpectedly'; end if;

  if has_function_privilege('anon','public.admin_get_commercial_readiness()','EXECUTE') then
    raise exception 'Anonymous role can read Admin commercial readiness';
  end if;
end
$$;

select 'SwiftTip MVP v3 legal draft assertions passed' as result;

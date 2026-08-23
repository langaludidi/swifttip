-- SwiftTip MVP v3 — Venue, pilot, legal-content and anonymous receipt control assertions.
-- Safe to execute repeatedly. Raises on invariant failure.

do $$
declare
  v_count integer;
begin
  -- Pre-go-live controls must still be inactive.
  select count(*) into v_count from public.pricing_versions where pricing_status='active';
  if v_count<>0 then raise exception 'Active pricing exists before go-live approval'; end if;
  select count(*) into v_count from public.terms_versions where published_at is not null and effective_from<=now() and (retired_at is null or retired_at>now());
  if v_count<>0 then raise exception 'Effective legal terms exist before publication approval'; end if;
  select count(*) into v_count from public.workers where worker_status='active';
  if v_count<>0 then raise exception 'Active Workers exist before controlled activation'; end if;
  select count(*) into v_count from public.venues where venue_status='active';
  if v_count<>0 then raise exception 'Active Venues exist before controlled pilot setup'; end if;
  select count(*) into v_count from public.pilot_cohorts where cohort_status='active';
  if v_count<>0 then raise exception 'Active pilot exists before explicit go-live approval'; end if;

  -- Receipt security architecture must exist.
  if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='tips' and column_name='customer_receipt_token' and data_type='uuid') then
    raise exception 'Customer receipt token column is missing';
  end if;
  if not exists(select 1 from pg_indexes where schemaname='public' and tablename='tips' and indexname='tips_customer_receipt_token_key') then
    raise exception 'Customer receipt token unique index is missing';
  end if;
  if not has_function_privilege('anon','public.get_customer_receipt_access(text,text)','EXECUTE') then raise exception 'Anonymous receipt-access RPC unavailable'; end if;
  if not has_function_privilege('anon','public.get_public_tip_receipt(uuid)','EXECUTE') then raise exception 'Anonymous receipt-view RPC unavailable'; end if;

  -- Venue/admin/pilot/financial operations remain signed-in only.
  if has_function_privilege('anon','public.get_my_venue_invitations()','EXECUTE') then raise exception 'Anonymous role can read Venue invitations'; end if;
  if has_function_privilege('anon','public.accept_venue_membership(uuid)','EXECUTE') then raise exception 'Anonymous role can accept Venue membership'; end if;
  if has_function_privilege('anon','public.admin_create_venue(text,text,text,text,text,text)','EXECUTE') then raise exception 'Anonymous role can create Venue'; end if;
  if has_function_privilege('anon','public.admin_create_draft_pilot(text,text,uuid,timestamptz,timestamptz)','EXECUTE') then raise exception 'Anonymous role can create pilot'; end if;
  if has_function_privilege('anon','public.admin_get_refund_queue(integer)','EXECUTE') then raise exception 'Anonymous role can read Refund queue'; end if;
  if has_function_privilege('anon','public.admin_get_dispute_queue(integer)','EXECUTE') then raise exception 'Anonymous role can read Dispute queue'; end if;

  -- No pilot activation shortcut may exist in the exposed public API.
  select count(*) into v_count
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and (p.proname ilike '%activate%pilot%' or p.proname ilike '%start%pilot%' or p.proname ilike '%pilot%activate%' or p.proname ilike '%pilot%start%');
  if v_count<>0 then raise exception 'Pilot activation shortcut exists in public API'; end if;

  -- Published legal text must be reviewable and immutable by trigger.
  if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='terms_versions' and column_name='content_body') then
    raise exception 'Terms content body is missing';
  end if;
  if not exists(select 1 from information_schema.triggers where event_object_schema='public' and event_object_table='terms_versions' and trigger_name='validate_terms_content_trigger') then
    raise exception 'Terms content integrity trigger is missing';
  end if;
  if not has_function_privilege('anon','public.get_effective_terms(text)','EXECUTE') then raise exception 'Published terms are not reviewable by public users'; end if;
end
$$;

select 'SwiftTip MVP v3 Venue/pilot/legal/receipt assertions passed' as result;

-- SwiftTip MVP v3 — in-app operational notification assertions.

do $$
declare v_count integer;
begin
  if has_function_privilege('anon','public.get_my_notifications(integer)','EXECUTE') then raise exception 'Anonymous role can read notifications'; end if;
  if has_function_privilege('anon','public.mark_my_notification_read(uuid)','EXECUTE') then raise exception 'Anonymous role can mark notifications read'; end if;
  if not has_function_privilege('authenticated','public.get_my_notifications(integer)','EXECUTE') then raise exception 'Authenticated notification inbox unavailable'; end if;
  if has_function_privilege('authenticated','private.create_in_app_notification(uuid,text,text,text,text,uuid,text,text)','EXECUTE') then raise exception 'Authenticated users can create arbitrary notifications'; end if;

  select count(distinct trigger_name) into v_count from information_schema.triggers
  where trigger_name in (
    'notify_worker_verification_change_trigger',
    'notify_worker_venue_association_change_trigger',
    'notify_venue_membership_invitation_trigger',
    'notify_support_case_change_trigger',
    'notify_worker_settlement_change_trigger'
  );
  if v_count<>5 then raise exception 'Expected notification trigger set is incomplete: %',v_count; end if;

  if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='notifications' and column_name='read_at') then raise exception 'Notification read state missing'; end if;
  if not exists(select 1 from pg_indexes where schemaname='public' and tablename='notifications' and indexname='notifications_dedupe_key_idx') then raise exception 'Notification dedupe protection missing'; end if;

  select count(*) into v_count from public.pricing_versions where pricing_status='active';
  if v_count<>0 then raise exception 'Pricing activated unexpectedly'; end if;
  select count(*) into v_count from public.pilot_cohorts where cohort_status='active';
  if v_count<>0 then raise exception 'Pilot activated unexpectedly'; end if;
end
$$;
select 'SwiftTip MVP v3 notification assertions passed' as result;

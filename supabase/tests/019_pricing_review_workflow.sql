-- SwiftTip MVP v3 — pricing review workflow and activation boundary.
-- Non-mutating: proves governance controls exist and pre-pilot pricing stays closed.

do $$
declare
  v_name text;
  v_proc oid;
begin
  foreach v_name in array array[
    'admin_get_pricing_versions',
    'admin_get_pricing_version',
    'admin_update_pricing_draft',
    'admin_submit_pricing_for_review',
    'admin_record_pricing_review',
    'admin_return_pricing_to_draft',
    'admin_approve_pricing'
  ] loop
    if not exists (
      select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and p.proname=v_name and p.prokind='f'
    ) then
      raise exception 'required pricing governance function % is missing',v_name;
    end if;
  end loop;

  foreach v_name in array array[
    'admin_update_pricing_draft',
    'admin_submit_pricing_for_review',
    'admin_record_pricing_review',
    'admin_return_pricing_to_draft',
    'admin_approve_pricing'
  ] loop
    for v_proc in
      select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and p.proname=v_name and p.prokind='f'
    loop
      if has_function_privilege('anon',v_proc,'EXECUTE') then
        raise exception 'anonymous role can execute pricing mutation %',v_name;
      end if;
    end loop;
  end loop;

  if not exists (
    select 1 from pg_trigger
    where tgrelid='public.pricing_versions'::regclass
      and tgname='guard_pricing_review_workflow_trigger'
      and not tgisinternal
  ) then
    raise exception 'pricing review guard trigger is missing';
  end if;

  if exists (
    select 1 from public.pricing_versions
    where pricing_status in ('scheduled','active') and review_status<>'approved'
  ) then
    raise exception 'scheduled or active pricing exists without approval';
  end if;

  if exists (
    select 1 from public.pricing_versions
    where review_status='approved'
      and (jsonb_array_length(commercial_blockers)<>0 or reviewed_at is null or approved_at is null)
  ) then
    raise exception 'approved pricing lacks required review evidence';
  end if;

  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prokind='f'
      and (p.proname ilike '%activate%pricing%' or p.proname ilike '%schedule%pricing%')
  ) then
    raise exception 'a prohibited pricing activation or scheduling RPC exists';
  end if;
end;
$$;

select '019_pricing_review_workflow: PASS' as result;

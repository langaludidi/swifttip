-- SwiftTip MVP v3 operational-control smoke assertions
-- Safe to execute repeatedly. Raises on privilege or cross-domain integrity regression.

do $$
declare
  v_bad_support_links integer;
  v_bad_active_endpoints integer;
  v_unapproved_live_workers integer;
  v_fn text;
begin
  -- None of the Worker/Admin operational RPCs introduced after the base schema
  -- may be executable by an anonymous customer session.
  foreach v_fn in array array[
    'public.start_worker_onboarding(text,text,text)',
    'public.get_worker_onboarding_state()',
    'public.accept_current_worker_terms(text)',
    'public.activate_current_worker()',
    'public.list_worker_available_venues(text,integer)',
    'public.request_worker_venue_association(uuid,text)',
    'public.worker_create_support_case(text,text,text,text)',
    'public.worker_get_support_cases(integer)',
    'public.admin_get_pricing_versions()',
    'public.admin_get_commercial_readiness()',
    'public.admin_get_support_cases(integer)',
    'public.admin_get_support_case_detail(uuid)',
    'public.admin_update_support_case(uuid,text,text)',
    'public.admin_get_audit_events(integer,text)',
    'public.admin_get_pilot_metrics(timestamp with time zone,timestamp with time zone)'
  ] loop
    if has_function_privilege('anon', v_fn, 'EXECUTE') then
      raise exception 'Anonymous role can execute privileged RPC %', v_fn;
    end if;
  end loop;

  if has_function_privilege('authenticated', 'private.new_support_case_reference()', 'EXECUTE') then
    raise exception 'Authenticated role can directly execute internal support reference generator';
  end if;

  -- A Worker support case may reference only one of that Worker's own Tips.
  select count(*) into v_bad_support_links
  from public.support_cases s
  join public.tips t on t.id = s.tip_id
  where s.worker_id is not null and t.worker_id <> s.worker_id;
  if v_bad_support_links <> 0 then
    raise exception 'Support cases contain % cross-Worker Tip link(s)', v_bad_support_links;
  end if;

  -- An active public endpoint must never exist for an inactive Worker or an
  -- unverified/ended Venue relationship.
  select count(*) into v_bad_active_endpoints
  from public.worker_tipping_endpoints e
  join public.workers w on w.id=e.worker_id
  join public.worker_venue_associations a on a.id=e.worker_venue_association_id
  join public.venues v on v.id=a.venue_id
  where e.endpoint_status='active'
    and (w.worker_status <> 'active'
      or a.association_status <> 'verified'
      or a.ended_at is not null
      or v.venue_status <> 'active');
  if v_bad_active_endpoints <> 0 then
    raise exception 'There are % invalid active tipping endpoint(s)', v_bad_active_endpoints;
  end if;

  -- Every active Worker must have passed the external identity, Venue and
  -- settlement gates. Terms acceptance is versioned separately and checked at
  -- activation time by activate_current_worker().
  select count(*) into v_unapproved_live_workers
  from public.workers w
  where w.worker_status='active'
    and (
      not exists (select 1 from public.worker_verifications x where x.worker_id=w.id and x.verification_type='identity' and x.verification_status='approved')
      or not exists (select 1 from public.worker_venue_associations a where a.worker_id=w.id and a.association_status='verified' and a.ended_at is null)
      or not exists (select 1 from public.provider_settlement_profiles p where p.worker_id=w.id and p.disabled_at is null and p.settlement_readiness='ready')
    );
  if v_unapproved_live_workers <> 0 then
    raise exception 'There are % active Worker(s) without mandatory external activation gates', v_unapproved_live_workers;
  end if;

  -- Pre-go-live commercial controls remain intentionally inactive until an
  -- explicit commercial/legal approval changes this test together with config.
  if exists (select 1 from public.pricing_versions where pricing_status='active') then
    raise exception 'Pricing became active without updating the pre-go-live control suite';
  end if;
  if exists (select 1 from public.terms_versions where published_at is not null) then
    raise exception 'Terms were published without updating the pre-go-live control suite';
  end if;
end
$$;

select 'SwiftTip MVP v3 operational-control smoke assertions passed' as result;

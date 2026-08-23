-- SwiftTip MVP v3 — pre-pilot control-plane and closed-state gate.
--
-- This suite is intentionally non-mutating. It proves that the complete controlled
-- onboarding/administration path exists while all commercial activation paths remain
-- closed. It does not create Auth identities, publish legal documents, activate pricing,
-- start a Pilot or enable public Tip intake.

do $$
declare
  v_name text;
  v_proc oid;
begin
  -- Required functions for the controlled Admin → Venue → Worker → Customer path.
  foreach v_name in array array[
    'bootstrap_admin_membership',
    'admin_create_venue',
    'admin_approve_venue',
    'admin_invite_venue_member_by_email',
    'accept_venue_membership',
    'accept_current_venue_terms',
    'record_worker_auth_bootstrap',
    'start_worker_onboarding',
    'start_worker_verification',
    'submit_worker_verification',
    'admin_decide_worker_verification',
    'request_worker_venue_association',
    'decide_worker_venue_association',
    'accept_current_worker_terms',
    'activate_current_worker',
    'resolve_short_code',
    'get_public_tipping_profile',
    'quote_tip',
    'create_tip',
    'get_customer_receipt_access',
    'get_public_tip_receipt'
  ] loop
    if not exists (
      select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = v_name
        and p.prokind = 'f'
    ) then
      raise exception 'required pre-pilot function % is missing', v_name;
    end if;
  end loop;

  -- Bootstrap/recovery controls are service-side only and must never become ordinary
  -- anon/authenticated RPCs.
  foreach v_name in array array[
    'bootstrap_admin_membership',
    'record_worker_auth_bootstrap',
    'record_admin_mfa_recovery_event'
  ] loop
    for v_proc in
      select p.oid
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = v_name
        and p.prokind = 'f'
    loop
      if has_function_privilege('anon', v_proc, 'EXECUTE')
         or has_function_privilege('authenticated', v_proc, 'EXECUTE') then
        raise exception 'service-side control % is executable by a client role', v_name;
      end if;
    end loop;
  end loop;

  -- The private Tip-intake controls must remain client-inaccessible.
  if has_table_privilege('anon', 'private.runtime_controls', 'SELECT')
     or has_table_privilege('authenticated', 'private.runtime_controls', 'SELECT')
     or has_table_privilege('anon', 'private.runtime_controls', 'UPDATE')
     or has_table_privilege('authenticated', 'private.runtime_controls', 'UPDATE') then
    raise exception 'runtime Tip-intake controls are exposed to a client role';
  end if;

  if has_function_privilege('anon', 'private.public_tip_intake_ready(timestamptz)', 'EXECUTE')
     or has_function_privilege('authenticated', 'private.public_tip_intake_ready(timestamptz)', 'EXECUTE') then
    raise exception 'private Tip-intake readiness helper is exposed to a client role';
  end if;

  -- The current pre-pilot baseline must remain economically closed.
  if coalesce((select public_tip_intake_enabled from private.runtime_controls where singleton = true), true) then
    raise exception 'public Tip intake is enabled during pre-pilot readiness';
  end if;

  if private.public_tip_intake_ready() then
    raise exception 'public Tip intake unexpectedly reports ready during pre-pilot readiness';
  end if;

  if exists (
    select 1 from public.pricing_versions
    where pricing_status = 'active'
      and effective_from <= now()
      and (effective_until is null or effective_until > now())
  ) then
    raise exception 'an active Pricing Version exists before commercial approval';
  end if;

  if exists (
    select 1 from public.terms_versions
    where published_at is not null
      and effective_from <= now()
      and retired_at is null
  ) then
    raise exception 'an effective published legal document exists before legal publication approval';
  end if;

  if exists (select 1 from public.pilot_cohorts where cohort_status = 'active') then
    raise exception 'an active Pilot cohort exists during pre-pilot readiness';
  end if;

  if exists (select 1 from public.worker_tipping_endpoints where endpoint_status = 'active') then
    raise exception 'an active Worker tipping endpoint exists before controlled activation testing';
  end if;

  -- There must still be no generic application-level activation RPC for legal publication,
  -- pricing, Pilot launch or the private Tip-intake switch. Worker activation is the one
  -- deliberate exception because it is independently gate-driven.
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and (
        p.proname ilike '%publish%legal%'
        or p.proname ilike '%publish%terms%'
        or p.proname ilike '%activate%pricing%'
        or p.proname ilike '%activate%pilot%'
        or p.proname ilike '%start%pilot%'
        or p.proname ilike '%enable%tip%intake%'
      )
  ) then
    raise exception 'a prohibited pre-live activation RPC has been introduced';
  end if;
end;
$$;

select '013_pre_pilot_control_plane: PASS' as result;

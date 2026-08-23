-- SwiftTip MVP v3 — Worker onboarding, commercial-term acceptance and activation gate.
-- No worker can become active unless identity, Venue, settlement and terms gates all pass.

create unique index if not exists terms_acceptances_worker_once_idx
  on public.terms_acceptances (terms_version_id, subject_id)
  where subject_type = 'worker' and subject_id is not null;

create or replace function public.start_worker_onboarding(
  p_legal_first_name text,
  p_legal_last_name text,
  p_display_first_name text
)
returns uuid
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_user_id uuid := auth.uid();
  v_worker_id uuid;
  v_first text := nullif(trim(p_legal_first_name), '');
  v_last text := nullif(trim(p_legal_last_name), '');
  v_display text := nullif(trim(p_display_first_name), '');
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;
  if v_first is null or v_last is null or v_display is null then
    raise exception 'Worker names are required';
  end if;
  if length(v_first) > 100 or length(v_last) > 100 or length(v_display) > 100 then
    raise exception 'Worker name is too long';
  end if;

  insert into public.user_profiles (id, display_name)
  values (v_user_id, v_display)
  on conflict (id) do update
    set display_name = excluded.display_name,
        updated_at = now();

  select id into v_worker_id
  from public.workers
  where user_id = v_user_id;

  if v_worker_id is null then
    insert into public.workers (
      user_id, legal_first_name, legal_last_name, display_first_name,
      worker_status, onboarding_status
    ) values (
      v_user_id, v_first, v_last, v_display,
      'draft', 'phone_verified'
    )
    returning id into v_worker_id;
  else
    update public.workers
    set legal_first_name = v_first,
        legal_last_name = v_last,
        display_first_name = v_display,
        updated_at = now()
    where id = v_worker_id
      and worker_status = 'draft';
  end if;

  return v_worker_id;
end;
$$;

create or replace function public.get_worker_onboarding_state()
returns table (
  worker_id uuid,
  worker_status text,
  onboarding_status text,
  identity_verification_status text,
  venue_association_id uuid,
  venue_association_status text,
  venue_name text,
  settlement_readiness text,
  worker_terms_version_id uuid,
  worker_terms_version_code text,
  worker_terms_published boolean,
  worker_terms_accepted boolean,
  activation_ready boolean,
  blocking_reasons text[]
)
language plpgsql
stable
security definer
set search_path = public, private
as $$
declare
  v_worker_id uuid := private.current_worker_id();
  v_worker_status text;
  v_onboarding_status text;
  v_identity text := 'not_started';
  v_assoc_id uuid;
  v_assoc_status text := 'not_started';
  v_venue_name text;
  v_settlement text := 'not_ready';
  v_terms_id uuid;
  v_terms_code text;
  v_terms_accepted boolean := false;
  v_reasons text[] := array[]::text[];
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if v_worker_id is null then raise exception 'Worker profile not started'; end if;

  select w.worker_status, w.onboarding_status
    into v_worker_status, v_onboarding_status
  from public.workers w where w.id = v_worker_id;

  select wv.verification_status
    into v_identity
  from public.worker_verifications wv
  where wv.worker_id = v_worker_id and wv.verification_type = 'identity'
  order by wv.created_at desc
  limit 1;
  v_identity := coalesce(v_identity, 'not_started');

  select wva.id, wva.association_status, v.trading_name
    into v_assoc_id, v_assoc_status, v_venue_name
  from public.worker_venue_associations wva
  join public.venues v on v.id = wva.venue_id
  where wva.worker_id = v_worker_id
    and wva.association_status in ('verified','pending','suspended')
    and wva.ended_at is null
  order by case wva.association_status when 'verified' then 0 when 'pending' then 1 else 2 end,
           wva.created_at desc
  limit 1;
  v_assoc_status := coalesce(v_assoc_status, 'not_started');

  select psp.settlement_readiness
    into v_settlement
  from public.provider_settlement_profiles psp
  where psp.worker_id = v_worker_id and psp.disabled_at is null
  order by case psp.settlement_readiness when 'ready' then 0 when 'pending' then 1 else 2 end,
           psp.updated_at desc
  limit 1;
  v_settlement := coalesce(v_settlement, 'not_ready');

  select tv.id, tv.version_code
    into v_terms_id, v_terms_code
  from public.terms_versions tv
  where tv.terms_type = 'worker_terms'
    and tv.published_at is not null
    and tv.effective_from <= now()
    and (tv.retired_at is null or tv.retired_at > now())
  order by tv.effective_from desc
  limit 1;

  if v_terms_id is not null then
    select exists (
      select 1 from public.terms_acceptances ta
      where ta.terms_version_id = v_terms_id
        and ta.subject_type = 'worker'
        and ta.subject_id = v_worker_id
    ) into v_terms_accepted;
  end if;

  if v_identity <> 'approved' then v_reasons := array_append(v_reasons, 'identity_verification'); end if;
  if v_assoc_status <> 'verified' then v_reasons := array_append(v_reasons, 'venue_confirmation'); end if;
  if v_settlement <> 'ready' then v_reasons := array_append(v_reasons, 'settlement_readiness'); end if;
  if v_terms_id is null then v_reasons := array_append(v_reasons, 'worker_terms_not_published');
  elsif not v_terms_accepted then v_reasons := array_append(v_reasons, 'worker_terms_acceptance'); end if;

  return query select
    v_worker_id,
    v_worker_status,
    v_onboarding_status,
    v_identity,
    v_assoc_id,
    v_assoc_status,
    v_venue_name,
    v_settlement,
    v_terms_id,
    v_terms_code,
    (v_terms_id is not null),
    v_terms_accepted,
    cardinality(v_reasons) = 0,
    v_reasons;
end;
$$;

create or replace function public.accept_current_worker_terms(
  p_acceptance_method text default 'checkbox'
)
returns uuid
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_worker_id uuid := private.current_worker_id();
  v_terms_id uuid;
  v_acceptance_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if v_worker_id is null then raise exception 'Worker profile not started'; end if;
  if p_acceptance_method not in ('checkbox','explicit_button') then
    raise exception 'Unsupported acceptance method';
  end if;

  select tv.id into v_terms_id
  from public.terms_versions tv
  where tv.terms_type = 'worker_terms'
    and tv.published_at is not null
    and tv.effective_from <= now()
    and (tv.retired_at is null or tv.retired_at > now())
  order by tv.effective_from desc
  limit 1;

  if v_terms_id is null then raise exception 'Worker terms are not yet published'; end if;

  insert into public.terms_acceptances (
    terms_version_id, subject_type, subject_id, acceptance_method, evidence_metadata
  ) values (
    v_terms_id, 'worker', v_worker_id, p_acceptance_method,
    jsonb_build_object('user_id', auth.uid(), 'aal', coalesce(auth.jwt()->>'aal','aal1'))
  )
  on conflict (terms_version_id, subject_id) where subject_type = 'worker' and subject_id is not null
  do update set accepted_at = public.terms_acceptances.accepted_at
  returning id into v_acceptance_id;

  return v_acceptance_id;
end;
$$;

create or replace function public.activate_current_worker()
returns void
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_worker_id uuid := private.current_worker_id();
  v_ready boolean;
  v_reasons text[];
  v_status text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if v_worker_id is null then raise exception 'Worker profile not started'; end if;

  select s.activation_ready, s.blocking_reasons, s.worker_status
    into v_ready, v_reasons, v_status
  from public.get_worker_onboarding_state() s;

  if v_status in ('suspended','inactive') then
    raise exception 'Worker status does not permit self-activation';
  end if;
  if not coalesce(v_ready,false) then
    raise exception 'Activation requirements incomplete: %', array_to_string(v_reasons, ', ');
  end if;

  update public.workers
  set worker_status = 'active',
      onboarding_status = 'ready',
      activated_at = coalesce(activated_at, now()),
      updated_at = now()
  where id = v_worker_id and worker_status = 'draft';
end;
$$;

revoke all on function public.start_worker_onboarding(text,text,text) from public, anon;
revoke all on function public.get_worker_onboarding_state() from public, anon;
revoke all on function public.accept_current_worker_terms(text) from public, anon;
revoke all on function public.activate_current_worker() from public, anon;
grant execute on function public.start_worker_onboarding(text,text,text) to authenticated;
grant execute on function public.get_worker_onboarding_state() to authenticated;
grant execute on function public.accept_current_worker_terms(text) to authenticated;
grant execute on function public.activate_current_worker() to authenticated;

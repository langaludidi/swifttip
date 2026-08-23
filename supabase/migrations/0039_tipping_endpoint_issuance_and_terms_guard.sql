-- SwiftTip MVP v3 — issue the first customer-facing tipping endpoint only after
-- every Worker activation gate passes, and enforce legal acceptance validity at
-- the table boundary.

alter table public.worker_tipping_endpoints
  add constraint worker_tipping_endpoint_public_token_format_chk
    check (public_token ~ '^[0-9a-f]{48}$'),
  add constraint worker_tipping_endpoint_short_code_format_chk
    check (short_code ~ '^[0-9A-Z]{8}$');

create unique index if not exists one_active_tipping_endpoint_per_worker_idx
  on public.worker_tipping_endpoints(worker_id)
  where endpoint_status = 'active';

create or replace function private.generate_tipping_short_code()
returns text
language plpgsql
volatile
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_alphabet constant text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  v_bytes bytea := gen_random_bytes(8);
  v_code text := '';
  i integer;
begin
  for i in 0..7 loop
    v_code := v_code || substr(v_alphabet, (get_byte(v_bytes, i) % 32) + 1, 1);
  end loop;
  return v_code;
end;
$$;

revoke all on function private.generate_tipping_short_code() from public, anon, authenticated;

create or replace function private.enforce_terms_acceptance_validity()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_terms_type text;
  v_published_at timestamptz;
  v_effective_from timestamptz;
  v_retired_at timestamptz;
  v_expected_terms_type text;
begin
  select terms_type, published_at, effective_from, retired_at
    into strict v_terms_type, v_published_at, v_effective_from, v_retired_at
  from public.terms_versions
  where id = new.terms_version_id;

  v_expected_terms_type := case new.subject_type
    when 'worker' then 'worker_terms'
    when 'venue_user' then 'venue_terms'
    when 'customer_transaction' then 'customer_transaction_terms'
    else null
  end;

  if v_expected_terms_type is null or v_terms_type <> v_expected_terms_type then
    raise exception 'Terms acceptance document type does not match subject type';
  end if;

  if v_published_at is null or v_published_at > new.accepted_at then
    raise exception 'Terms acceptance requires a published document';
  end if;

  if v_effective_from > new.accepted_at then
    raise exception 'Terms acceptance document is not yet effective';
  end if;

  if v_retired_at is not null and v_retired_at <= new.accepted_at then
    raise exception 'Terms acceptance document is retired';
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_terms_acceptance_validity() from public, anon, authenticated;

drop trigger if exists enforce_terms_acceptance_validity on public.terms_acceptances;
create trigger enforce_terms_acceptance_validity
before insert or update of terms_version_id, subject_type, accepted_at
on public.terms_acceptances
for each row execute function private.enforce_terms_acceptance_validity();

create or replace function public.activate_current_worker()
returns void
language plpgsql
security definer
set search_path = public, private, audit, pg_temp
as $$
declare
  v_worker_id uuid := private.current_worker_id();
  v_ready boolean;
  v_reasons text[];
  v_status text;
  v_association_id uuid;
  v_endpoint_id uuid;
  v_short_code text;
  v_public_token text;
  v_attempt integer;
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

  select wva.id into v_association_id
  from public.worker_venue_associations wva
  join public.venues v on v.id = wva.venue_id
  where wva.worker_id = v_worker_id
    and wva.association_status = 'verified'
    and wva.ended_at is null
    and v.venue_status = 'active'
  order by wva.confirmed_at desc nulls last, wva.created_at desc
  limit 1;

  if v_association_id is null then
    raise exception 'Verified active Venue association not found';
  end if;

  update public.workers
  set worker_status = 'active',
      onboarding_status = 'ready',
      activated_at = coalesce(activated_at, now()),
      updated_at = now()
  where id = v_worker_id
    and worker_status in ('draft','active');

  -- A Worker may have only one live customer entry point. If their verified Venue
  -- changes, any stale endpoint is disabled before a fresh endpoint is issued.
  update public.worker_tipping_endpoints
  set endpoint_status = 'disabled',
      disabled_at = coalesce(disabled_at, now())
  where worker_id = v_worker_id
    and endpoint_status = 'active'
    and worker_venue_association_id <> v_association_id;

  select id into v_endpoint_id
  from public.worker_tipping_endpoints
  where worker_id = v_worker_id
    and worker_venue_association_id = v_association_id
    and endpoint_status = 'active'
  limit 1;

  if v_endpoint_id is null then
    v_public_token := encode(gen_random_bytes(24), 'hex');

    for v_attempt in 1..20 loop
      v_short_code := private.generate_tipping_short_code();
      exit when not exists (
        select 1 from public.worker_tipping_endpoints where short_code = v_short_code
      );
    end loop;

    if v_short_code is null or exists (
      select 1 from public.worker_tipping_endpoints where short_code = v_short_code
    ) then
      raise exception 'Unable to issue unique Worker short code';
    end if;

    insert into public.worker_tipping_endpoints(
      worker_id,
      worker_venue_association_id,
      public_token,
      short_code,
      endpoint_status
    ) values (
      v_worker_id,
      v_association_id,
      v_public_token,
      v_short_code,
      'active'
    )
    returning id into v_endpoint_id;

    insert into audit.audit_events(
      actor_type,
      actor_user_id,
      actor_role,
      action,
      entity_type,
      entity_id,
      resulting_state,
      reason
    ) values (
      'worker',
      auth.uid(),
      'worker',
      'worker_tipping_endpoint_issued',
      'worker_tipping_endpoint',
      v_endpoint_id,
      jsonb_build_object(
        'worker_id', v_worker_id,
        'worker_venue_association_id', v_association_id,
        'endpoint_status', 'active'
      ),
      'All Worker activation gates satisfied'
    );
  end if;
end;
$$;

revoke all on function public.activate_current_worker() from public, anon;
grant execute on function public.activate_current_worker() to authenticated;

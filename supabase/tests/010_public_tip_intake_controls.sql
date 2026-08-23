-- SwiftTip MVP v3 — public Tip intake kill switch and database velocity safety controls.

do $$
declare
  v_name text;
  v_definition text;
begin
  if has_table_privilege('anon', 'private.runtime_controls', 'SELECT')
     or has_table_privilege('authenticated', 'private.runtime_controls', 'SELECT')
     or has_table_privilege('anon', 'private.runtime_controls', 'UPDATE')
     or has_table_privilege('authenticated', 'private.runtime_controls', 'UPDATE') then
    raise exception 'runtime controls must not be exposed to client roles';
  end if;

  if has_function_privilege('anon', 'private.public_tip_intake_ready(timestamptz)', 'EXECUTE')
     or has_function_privilege('authenticated', 'private.public_tip_intake_ready(timestamptz)', 'EXECUTE')
     or has_function_privilege('anon', 'private.assert_tip_creation_velocity(uuid,timestamptz)', 'EXECUTE')
     or has_function_privilege('authenticated', 'private.assert_tip_creation_velocity(uuid,timestamptz)', 'EXECUTE') then
    raise exception 'runtime intake helpers must remain private';
  end if;

  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'private'
      and c.relname = 'runtime_controls'
      and c.relkind = 'r'
  ) then
    raise exception 'runtime control table is missing';
  end if;

  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'tips'
      and indexname = 'tips_endpoint_created_idx'
  ) then
    raise exception 'Tip velocity supporting index is missing';
  end if;

  select pg_get_functiondef('private.public_tip_intake_ready(timestamptz)'::regprocedure)
    into v_definition;
  if v_definition not ilike '%public_tip_intake_enabled%'
     or v_definition not ilike '%pricing_status = ''active''%'
     or v_definition not ilike '%customer_transaction_terms%'
     or v_definition not ilike '%published_at is not null%' then
    raise exception 'runtime readiness no longer requires switch, active pricing and published Customer Terms';
  end if;

  select pg_get_functiondef('public.create_tip(text,bigint,text)'::regprocedure)
    into v_definition;
  if v_definition not ilike '%public_tip_intake_ready%'
     or v_definition not ilike '%assert_tip_creation_velocity%'
     or v_definition not ilike '%tip_velocity:%'
     or v_definition not ilike '%v_existing_resource is not null%' then
    raise exception 'create_tip no longer enforces intake state, velocity and idempotent replay ordering';
  end if;

  foreach v_name in array array['resolve_short_code','get_public_tipping_profile','quote_tip'] loop
    select pg_get_functiondef(p.oid)
      into v_definition
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = v_name
      and p.prokind = 'f'
    order by p.oid desc
    limit 1;

    if v_definition is null or v_definition not ilike '%public_tip_intake_ready%' then
      raise exception '% no longer respects the public Tip intake kill switch', v_name;
    end if;
  end loop;

  select pg_get_functiondef('public.admin_get_commercial_readiness()'::regprocedure)
    into v_definition;
  if v_definition not ilike '%public_tip_intake_enabled%'
     or v_definition not ilike '%public_tip_intake_ready%'
     or v_definition not ilike '%max_tip_intents_per_endpoint_1m%' then
    raise exception 'Admin readiness no longer exposes runtime intake state';
  end if;
end;
$$;

select '010_public_tip_intake_controls: PASS' as result;

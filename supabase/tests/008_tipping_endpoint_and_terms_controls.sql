-- SwiftTip MVP v3 — tipping endpoint issuance and legal acceptance invariants.

do $$
declare
  v_activate_definition text;
  v_terms_guard_definition text;
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.worker_tipping_endpoints'::regclass
      and conname = 'worker_tipping_endpoint_public_token_format_chk'
      and convalidated
  ) then
    raise exception '192-bit public token format constraint is missing';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.worker_tipping_endpoints'::regclass
      and conname = 'worker_tipping_endpoint_short_code_format_chk'
      and convalidated
  ) then
    raise exception '8-character short-code format constraint is missing';
  end if;

  if not exists (
    select 1
    from pg_index i
    join pg_class c on c.oid = i.indexrelid
    where c.relname = 'one_active_tipping_endpoint_per_worker_idx'
      and i.indisunique
      and pg_get_expr(i.indpred, i.indrelid) ilike '%endpoint_status%active%'
  ) then
    raise exception 'one-active-endpoint-per-Worker unique index is missing';
  end if;

  if has_function_privilege('anon', 'private.generate_tipping_short_code()', 'EXECUTE')
     or has_function_privilege('authenticated', 'private.generate_tipping_short_code()', 'EXECUTE') then
    raise exception 'short-code generator must remain private';
  end if;

  if has_function_privilege('anon', 'private.enforce_terms_acceptance_validity()', 'EXECUTE')
     or has_function_privilege('authenticated', 'private.enforce_terms_acceptance_validity()', 'EXECUTE') then
    raise exception 'terms acceptance guard must remain private';
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.terms_acceptances'::regclass
      and tgname = 'enforce_terms_acceptance_validity'
      and not tgisinternal
      and tgenabled <> 'D'
  ) then
    raise exception 'terms acceptance validity trigger is missing';
  end if;

  select pg_get_functiondef('public.activate_current_worker()'::regprocedure)
    into v_activate_definition;
  if v_activate_definition not ilike '%get_worker_onboarding_state%'
     or v_activate_definition not ilike '%gen_random_bytes(24)%'
     or v_activate_definition not ilike '%worker_tipping_endpoint_issued%'
     or v_activate_definition not ilike '%association_status = ''verified''%'
     or v_activate_definition not ilike '%venue_status = ''active''%' then
    raise exception 'Worker activation no longer contains all endpoint issuance gates';
  end if;

  select pg_get_functiondef('private.enforce_terms_acceptance_validity()'::regprocedure)
    into v_terms_guard_definition;
  if v_terms_guard_definition not ilike '%published_at%'
     or v_terms_guard_definition not ilike '%effective_from%'
     or v_terms_guard_definition not ilike '%retired_at%'
     or v_terms_guard_definition not ilike '%customer_transaction_terms%' then
    raise exception 'Terms acceptance guard no longer enforces publication/effectivity/type invariants';
  end if;
end;
$$;

select '008_tipping_endpoint_and_terms_controls: PASS' as result;

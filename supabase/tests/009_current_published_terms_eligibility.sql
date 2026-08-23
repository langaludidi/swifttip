-- SwiftTip MVP v3 — current published Terms must govern every customer tipping surface.

do $$
declare
  v_name text;
  v_definition text;
begin
  if has_function_privilege('anon', 'private.worker_has_current_terms_acceptance(uuid,timestamptz)', 'EXECUTE')
     or has_function_privilege('authenticated', 'private.worker_has_current_terms_acceptance(uuid,timestamptz)', 'EXECUTE') then
    raise exception 'current Worker Terms helper must remain private';
  end if;

  select pg_get_functiondef('private.worker_has_current_terms_acceptance(uuid,timestamptz)'::regprocedure)
    into v_definition;
  if v_definition not ilike '%published_at is not null%'
     or v_definition not ilike '%effective_from <= p_at%'
     or v_definition not ilike '%retired_at is null or tv.retired_at > p_at%'
     or v_definition not ilike '%order by tv.effective_from desc%'
     or v_definition not ilike '%ta.subject_id = p_worker_id%' then
    raise exception 'current Worker Terms helper no longer enforces the canonical current-version rule';
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

    if v_definition is null or v_definition not ilike '%worker_has_current_terms_acceptance%' then
      raise exception '% no longer requires current Worker Terms acceptance', v_name;
    end if;
  end loop;

  select pg_get_functiondef('public.create_tip(text,bigint,text)'::regprocedure)
    into v_definition;
  if v_definition not ilike '%worker_has_current_terms_acceptance%'
     or v_definition not ilike '%terms_type = ''customer_transaction_terms''%'
     or v_definition not ilike '%published_at is not null%'
     or v_definition not ilike '%published_at <= now()%'
     or v_definition not ilike '%effective_from <= now()%'
     or v_definition not ilike '%retired_at is null or tv.retired_at > now()%'
     or v_definition not ilike '%length(trim(p_public_token)) <> 48%' then
    raise exception 'create_tip no longer enforces published Terms and canonical endpoint token rules';
  end if;
end;
$$;

select '009_current_published_terms_eligibility: PASS' as result;

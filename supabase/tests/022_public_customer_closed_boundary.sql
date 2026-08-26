-- SwiftTip MVP v3 — closed anonymous Customer boundary.
--
-- Exercises only invalid public identifiers while intake is closed. The transaction
-- is rolled back and must not create a Tip, endpoint, receipt or payment record.

begin;

select set_config('swifttip_test.tip_count_before',(select count(*)::text from public.tips),true);

do $$
begin
  if has_table_privilege('anon','private.runtime_controls','SELECT')
     or has_table_privilege('anon','private.runtime_controls','UPDATE') then
    raise exception 'Anonymous role can access private runtime controls';
  end if;

  if has_function_privilege(
    'anon',
    'private.public_tip_intake_ready(timestamptz)',
    'EXECUTE'
  ) then
    raise exception 'Anonymous role can execute the private intake-readiness function';
  end if;
end;
$$;

set local role anon;
select set_config('request.jwt.claims','{"role":"anon"}',true);

do $$
declare
  v_rows bigint;
  v_public_token text;
  v_quote_blocked boolean := false;
  v_create_blocked boolean := false;
begin
  select public.resolve_short_code('PREPILOT-NO-ENDPOINT') into v_public_token;
  if v_public_token is not null then raise exception 'Invalid short code resolved'; end if;

  select count(*) into v_rows
  from public.get_public_tipping_profile(repeat('x',48));
  if v_rows <> 0 then raise exception 'Invalid endpoint exposed a public profile'; end if;

  begin
    perform * from public.quote_tip(repeat('x',48),1000);
  exception when others then
    v_quote_blocked := sqlerrm = 'Public Tip intake is not enabled';
  end;
  if not v_quote_blocked then
    raise exception 'Anonymous quote did not fail through the closed intake gate';
  end if;

  begin
    perform * from public.create_tip(
      repeat('x',48),
      1000,
      'prepilot-closed-boundary'
    );
  exception when others then
    v_create_blocked := sqlerrm = 'Public Tip intake is not enabled';
  end;
  if not v_create_blocked then
    raise exception 'Anonymous Tip creation did not fail through the closed intake gate';
  end if;

  select count(*) into v_rows
  from public.get_customer_receipt_access(
    'ST-PREPILOT',
    'prepilot-invalid-receipt-key'
  );
  if v_rows <> 0 then raise exception 'Invalid reference/key disclosed a receipt token'; end if;

  select count(*) into v_rows
  from public.get_public_tip_receipt('00000000-0000-0000-0000-000000000000'::uuid);
  if v_rows <> 0 then raise exception 'Invalid opaque token disclosed a receipt'; end if;
end;
$$;

reset role;

do $$
begin
  if (select public_tip_intake_enabled from private.runtime_controls where singleton) then
    raise exception 'Public Tip intake is enabled';
  end if;

  if private.public_tip_intake_ready(now()) then
    raise exception 'Public Tip intake unexpectedly reports ready';
  end if;

  if (select count(*) from public.tips)
     <> current_setting('swifttip_test.tip_count_before')::bigint then
    raise exception 'Closed-boundary test changed the Tip count';
  end if;
end;
$$;

rollback;
select '022_public_customer_closed_boundary: PASS' as result;

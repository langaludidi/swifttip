-- SwiftTip MVP v3 — rollback-only actor-isolation simulation.
-- Synthetic auth UUIDs are used only as JWT subjects. FK trigger enforcement is
-- disabled during seed insertion inside this transaction, restored before any test,
-- and every synthetic row is rolled back at the end.

begin;
set local session_replication_role = replica;

insert into public.workers(id,user_id,legal_first_name,legal_last_name,display_first_name,worker_status,onboarding_status)
values
('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Worker','Alpha','Alpha','active','ready'),
('10000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002','Worker','Beta','Beta','active','ready');

insert into public.venues(id,trading_name,branch_name,venue_type,city,province,public_location_label,venue_status,approved_at)
values
('30000000-0000-4000-8000-000000000001','Isolation Venue A','Branch A','fuel_station','Gqeberha','Eastern Cape','Gqeberha','active',now()),
('30000000-0000-4000-8000-000000000002','Isolation Venue B','Branch B','restaurant','East London','Eastern Cape','East London','active',now());

insert into public.worker_venue_associations(id,worker_id,venue_id,worker_role,association_status,confirmed_at,started_at)
values
('40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','Fuel Attendant','verified',now(),now()),
('40000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000002','Server','verified',now(),now());

insert into public.venue_memberships(id,user_id,venue_id,venue_role,membership_status,accepted_at)
values
('50000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','venue_admin','active',now()),
('50000000-0000-4000-8000-000000000002','60000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000002','venue_admin','active',now());

insert into public.admin_memberships(id,user_id,admin_role,admin_status,mfa_required)
values ('70000000-0000-4000-8000-000000000001','80000000-0000-4000-8000-000000000001','super_admin','active',true);

set local session_replication_role = origin;
set local role authenticated;

-- Worker A: self only, plus only the Venue/association that belongs to Worker A.
select set_config('request.jwt.claims','{"sub":"20000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}',true);
do $$
declare v_count integer;
begin
  select count(*) into v_count from public.workers;
  if v_count<>1 then raise exception 'Worker A can see % Worker rows; expected exactly 1',v_count; end if;
  if not exists(select 1 from public.workers where id='10000000-0000-4000-8000-000000000001') then raise exception 'Worker A cannot see own Worker row'; end if;
  if exists(select 1 from public.workers where id='10000000-0000-4000-8000-000000000002') then raise exception 'Worker A can see Worker B'; end if;

  select count(*) into v_count from public.venues;
  if v_count<>1 or not exists(select 1 from public.venues where id='30000000-0000-4000-8000-000000000001') then raise exception 'Worker A Venue visibility is not isolated'; end if;
  if exists(select 1 from public.venues where id='30000000-0000-4000-8000-000000000002') then raise exception 'Worker A can see unrelated Venue B'; end if;

  select count(*) into v_count from public.worker_venue_associations;
  if v_count<>1 or not exists(select 1 from public.worker_venue_associations where id='40000000-0000-4000-8000-000000000001') then raise exception 'Worker A association visibility is not isolated'; end if;

  begin
    update public.workers set display_first_name='Changed' where id='10000000-0000-4000-8000-000000000001';
    raise exception 'Authenticated Worker unexpectedly obtained direct UPDATE authority';
  exception when insufficient_privilege then null;
  end;
end;$$;

-- Venue A member: may read Venue A/membership/associations at Venue A, but no Worker table identities or Venue B.
select set_config('request.jwt.claims','{"sub":"60000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}',true);
do $$
declare v_count integer;
begin
  select count(*) into v_count from public.venue_memberships;
  if v_count<>1 or not exists(select 1 from public.venue_memberships where venue_id='30000000-0000-4000-8000-000000000001') then raise exception 'Venue A membership isolation failed'; end if;

  select count(*) into v_count from public.venues;
  if v_count<>1 or not exists(select 1 from public.venues where id='30000000-0000-4000-8000-000000000001') then raise exception 'Venue A visibility failed'; end if;
  if exists(select 1 from public.venues where id='30000000-0000-4000-8000-000000000002') then raise exception 'Venue A user can see Venue B'; end if;

  select count(*) into v_count from public.worker_venue_associations;
  if v_count<>1 or not exists(select 1 from public.worker_venue_associations where id='40000000-0000-4000-8000-000000000001') then raise exception 'Venue A association visibility failed'; end if;

  if exists(select 1 from public.workers) then raise exception 'Venue user can read Worker identity table directly'; end if;

  select count(*) into v_count from public.get_venue_workers('30000000-0000-4000-8000-000000000001');
  if v_count<>1 then raise exception 'Venue A authorised Worker projection returned %, expected 1',v_count; end if;

  begin
    perform * from public.get_venue_workers('30000000-0000-4000-8000-000000000002');
    raise exception 'Venue A user unexpectedly accessed Venue B Worker projection';
  exception when others then
    if sqlerrm='Venue A user unexpectedly accessed Venue B Worker projection' then raise; end if;
  end;
end;$$;

-- Ordinary signed-in user without Admin membership must not enter Admin RPCs even at AAL2.
select set_config('request.jwt.claims','{"sub":"90000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}',true);
do $$
begin
  begin
    perform * from public.admin_get_dashboard();
    raise exception 'Non-Admin unexpectedly entered Admin dashboard RPC';
  exception when others then
    if sqlerrm='Non-Admin unexpectedly entered Admin dashboard RPC' then raise; end if;
    if position('Admin role not authorised' in sqlerrm)=0 then raise exception 'Unexpected non-Admin rejection: %',sqlerrm; end if;
  end;
end;$$;

-- Active Super Admin at AAL1 must still be rejected by the database.
select set_config('request.jwt.claims','{"sub":"80000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}',true);
do $$
begin
  begin
    perform * from public.admin_get_dashboard();
    raise exception 'AAL1 Admin unexpectedly entered privileged Admin RPC';
  exception when others then
    if sqlerrm='AAL1 Admin unexpectedly entered privileged Admin RPC' then raise; end if;
    if position('MFA assurance level required' in sqlerrm)=0 then raise exception 'Unexpected AAL1 Admin rejection: %',sqlerrm; end if;
  end;
end;$$;

-- The same active Super Admin at AAL2 may execute the privileged projection.
select set_config('request.jwt.claims','{"sub":"80000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}',true);
do $$
begin
  perform * from public.admin_get_dashboard();
end;$$;

reset role;
rollback;

select '014_actor_isolation_simulation: PASS' as result;

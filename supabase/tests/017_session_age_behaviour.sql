-- SwiftTip MVP v3 — rollback-only session maximum-age behaviour test.

begin;

insert into auth.users(id) values ('11111111-1111-4111-8111-111111111111');
insert into auth.sessions(id,user_id,created_at,updated_at,aal)
values ('22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111',now(),now(),'aal1');

set local role authenticated;
select set_config('request.jwt.claims', jsonb_build_object(
  'sub','11111111-1111-4111-8111-111111111111',
  'role','authenticated','aal','aal1',
  'session_id','22222222-2222-4222-8222-222222222222'
)::text, true);
do $$ begin
  if not public.session_access_allowed('worker') then raise exception 'fresh worker session rejected'; end if;
  if not public.session_access_allowed('venue') then raise exception 'fresh venue session rejected'; end if;
  if not public.session_access_allowed('admin') then raise exception 'fresh admin session rejected'; end if;
end $$;
reset role;

update auth.sessions set created_at=now()-interval '9 hours' where id='22222222-2222-4222-8222-222222222222';
set local role authenticated;
do $$ begin
  if public.session_access_allowed('admin') then raise exception '9-hour admin session should require re-auth'; end if;
  if not public.session_access_allowed('venue') then raise exception '9-hour venue session should remain valid'; end if;
  if not public.session_access_allowed('worker') then raise exception '9-hour worker session should remain valid'; end if;
end $$;
reset role;

update auth.sessions set created_at=now()-interval '25 hours' where id='22222222-2222-4222-8222-222222222222';
set local role authenticated;
do $$ begin
  if public.session_access_allowed('admin') then raise exception '25-hour admin session should be invalid'; end if;
  if public.session_access_allowed('venue') then raise exception '25-hour venue session should require re-auth'; end if;
  if not public.session_access_allowed('worker') then raise exception '25-hour worker session should remain valid'; end if;
end $$;
reset role;

update auth.sessions set created_at=now()-interval '8 days' where id='22222222-2222-4222-8222-222222222222';
set local role authenticated;
do $$ begin
  if public.session_access_allowed('worker') then raise exception '8-day worker session should require re-auth'; end if;
end $$;
reset role;

rollback;

select '017_session_age_behaviour: PASS' as result;

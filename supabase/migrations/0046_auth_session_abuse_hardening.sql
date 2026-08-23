-- SwiftTip MVP v3 — authentication abuse controls and session-age boundaries.

create table if not exists private.auth_abuse_secret (
  singleton boolean primary key default true check (singleton),
  pepper uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now()
);

insert into private.auth_abuse_secret(singleton)
values (true)
on conflict (singleton) do nothing;

revoke all on private.auth_abuse_secret from public, anon, authenticated;

create table if not exists private.auth_attempt_buckets (
  scope text not null,
  key_kind text not null check (key_kind in ('pair','ip','user')),
  key_hash text not null check (key_hash ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz not null default now(),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_attempt_at timestamptz,
  blocked_until timestamptz,
  updated_at timestamptz not null default now(),
  primary key (scope, key_kind, key_hash)
);

create index if not exists auth_attempt_buckets_blocked_idx
  on private.auth_attempt_buckets(blocked_until)
  where blocked_until is not null;

revoke all on private.auth_attempt_buckets from public, anon, authenticated;

create or replace function private.auth_abuse_hash(p_value text)
returns text
language sql
stable
security definer
set search_path = private, extensions, pg_temp
as $$
  select encode(
    extensions.digest(
      convert_to((select pepper::text from private.auth_abuse_secret where singleton) || ':' || coalesce(p_value,''), 'UTF8'),
      'sha256'
    ),
    'hex'
  );
$$;

revoke all on function private.auth_abuse_hash(text) from public, anon, authenticated;

create or replace function private.consume_auth_bucket(
  p_scope text,
  p_key_kind text,
  p_key_value text,
  p_window_seconds integer,
  p_max_attempts integer,
  p_cooldown_seconds integer default 0,
  p_block_seconds integer default 900
)
returns integer
language plpgsql
security definer
set search_path = private, pg_temp
as $$
declare
  v_hash text := private.auth_abuse_hash(p_scope || ':' || p_key_kind || ':' || coalesce(p_key_value,''));
  v_row private.auth_attempt_buckets;
  v_now timestamptz := now();
  v_retry integer := 0;
begin
  if p_window_seconds < 1 or p_max_attempts < 1 or p_cooldown_seconds < 0 or p_block_seconds < 1 then
    raise exception 'Invalid authentication abuse-control parameters';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('auth-abuse:' || p_scope || ':' || p_key_kind || ':' || v_hash, 0));

  insert into private.auth_attempt_buckets(scope,key_kind,key_hash)
  values(p_scope,p_key_kind,v_hash)
  on conflict do nothing;

  select * into strict v_row
  from private.auth_attempt_buckets
  where scope=p_scope and key_kind=p_key_kind and key_hash=v_hash
  for update;

  if v_row.blocked_until is not null and v_row.blocked_until > v_now then
    return greatest(1, ceil(extract(epoch from (v_row.blocked_until-v_now)))::integer);
  end if;

  if v_row.window_started_at <= v_now - make_interval(secs => p_window_seconds) then
    update private.auth_attempt_buckets
    set window_started_at=v_now, attempt_count=0, blocked_until=null, updated_at=v_now
    where scope=p_scope and key_kind=p_key_kind and key_hash=v_hash
    returning * into v_row;
  end if;

  if p_cooldown_seconds > 0 and v_row.last_attempt_at is not null
     and v_row.last_attempt_at > v_now - make_interval(secs => p_cooldown_seconds) then
    v_retry := ceil(extract(epoch from ((v_row.last_attempt_at + make_interval(secs => p_cooldown_seconds))-v_now)))::integer;
    return greatest(1,v_retry);
  end if;

  if v_row.attempt_count >= p_max_attempts then
    update private.auth_attempt_buckets
    set blocked_until=v_now + make_interval(secs => p_block_seconds), updated_at=v_now
    where scope=p_scope and key_kind=p_key_kind and key_hash=v_hash;
    return p_block_seconds;
  end if;

  update private.auth_attempt_buckets
  set attempt_count=attempt_count+1, last_attempt_at=v_now, blocked_until=null, updated_at=v_now
  where scope=p_scope and key_kind=p_key_kind and key_hash=v_hash;

  return 0;
end;
$$;

revoke all on function private.consume_auth_bucket(text,text,text,integer,integer,integer,integer) from public, anon, authenticated;

create or replace function public.auth_abuse_admit(
  p_scope text,
  p_identifier text,
  p_ip text default null
)
returns table(allowed boolean, retry_after_seconds integer)
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_scope text := lower(trim(coalesce(p_scope,'')));
  v_identifier text := lower(trim(coalesce(p_identifier,'')));
  v_ip text := left(coalesce(nullif(trim(p_ip),''),'unknown'),128);
  v_pair_retry integer := 0;
  v_ip_retry integer := 0;
  v_user_retry integer := 0;
  v_uid uuid := auth.uid();
begin
  if v_scope not in (
    'worker_otp_request','worker_otp_verify',
    'venue_otp_request','venue_otp_verify',
    'admin_otp_request','admin_otp_verify',
    'admin_mfa_verify','admin_mfa_enroll'
  ) then
    raise exception 'Unsupported authentication control scope';
  end if;

  if length(v_identifier) < 3 or length(v_identifier) > 254 then
    raise exception 'Invalid authentication identifier';
  end if;

  if v_scope like '%_otp_request' then
    v_pair_retry := private.consume_auth_bucket(v_scope,'pair',v_identifier || ':' || v_ip,900,5,60,900);
    v_ip_retry := private.consume_auth_bucket(v_scope,'ip',v_ip,900,30,0,900);
  elsif v_scope like '%_otp_verify' then
    v_pair_retry := private.consume_auth_bucket(v_scope,'pair',v_identifier || ':' || v_ip,900,8,0,900);
    v_ip_retry := private.consume_auth_bucket(v_scope,'ip',v_ip,900,60,0,900);
  else
    if v_uid is null then raise exception 'Authentication required'; end if;
    v_pair_retry := private.consume_auth_bucket(v_scope,'pair',v_uid::text || ':' || v_ip,900,6,0,1800);
    v_ip_retry := private.consume_auth_bucket(v_scope,'ip',v_ip,900,30,0,1800);
    v_user_retry := private.consume_auth_bucket(v_scope,'user',v_uid::text,3600,10,0,3600);
  end if;

  return query select
    greatest(v_pair_retry,v_ip_retry,v_user_retry)=0,
    greatest(v_pair_retry,v_ip_retry,v_user_retry);
end;
$$;

revoke all on function public.auth_abuse_admit(text,text,text) from public;
grant execute on function public.auth_abuse_admit(text,text,text) to anon, authenticated;

create or replace function private.session_within_max_age(p_max_age interval)
returns boolean
language sql
stable
security definer
set search_path = auth, private, pg_temp
as $$
  select exists (
    select 1
    from auth.sessions s
    where s.id = nullif(auth.jwt()->>'session_id','')::uuid
      and s.user_id = auth.uid()
      and s.created_at > now() - p_max_age
      and (s.not_after is null or s.not_after > now())
  );
$$;

revoke all on function private.session_within_max_age(interval) from public, anon, authenticated;

create or replace function public.session_access_allowed(p_surface text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_surface text := lower(trim(coalesce(p_surface,'')));
begin
  if auth.uid() is null then return false; end if;
  if v_surface='worker' then return private.session_within_max_age(interval '7 days'); end if;
  if v_surface='venue' then return private.session_within_max_age(interval '24 hours'); end if;
  if v_surface='admin' then return private.session_within_max_age(interval '8 hours'); end if;
  raise exception 'Unsupported session surface';
end;
$$;

revoke all on function public.session_access_allowed(text) from public, anon;
grant execute on function public.session_access_allowed(text) to authenticated;

create or replace function private.current_worker_id()
returns uuid
language sql
stable
security definer
set search_path = public, private
as $$
  select w.id
  from public.workers w
  where w.user_id = auth.uid()
    and private.session_within_max_age(interval '7 days')
  limit 1;
$$;

create or replace function private.current_venue_role(p_venue_id uuid)
returns text
language sql
stable
security definer
set search_path = public, private
as $$
  select vm.venue_role
  from public.venue_memberships vm
  where vm.user_id = auth.uid()
    and vm.venue_id = p_venue_id
    and vm.membership_status = 'active'
    and private.session_within_max_age(interval '24 hours')
  limit 1;
$$;

create or replace function private.user_has_venue_access(p_venue_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select private.session_within_max_age(interval '24 hours') and exists (
    select 1
    from public.venue_memberships vm
    where vm.user_id = auth.uid()
      and vm.venue_id = p_venue_id
      and vm.membership_status = 'active'
  );
$$;

create or replace function private.require_admin_role(p_allowed_roles text[])
returns text
language plpgsql
stable
security definer
set search_path = public, private
as $$
declare
  v_role text;
  v_aal text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not private.session_within_max_age(interval '8 hours') then raise exception 'Admin re-authentication required'; end if;

  select a.admin_role into v_role
  from public.admin_memberships a
  where a.user_id = auth.uid() and a.admin_status = 'active'
  limit 1;

  if v_role is null or not (v_role = any(p_allowed_roles)) then
    raise exception 'Admin role not authorised';
  end if;

  v_aal := coalesce(auth.jwt() ->> 'aal', 'aal1');
  if v_aal <> 'aal2' then raise exception 'MFA assurance level required'; end if;
  return v_role;
end;
$$;

-- Retain private helper posture after replacement.
revoke all on function private.current_worker_id() from public, anon, authenticated;
revoke all on function private.current_venue_role(uuid) from public, anon, authenticated;
revoke all on function private.user_has_venue_access(uuid) from public, anon, authenticated;
revoke all on function private.require_admin_role(text[]) from public, anon, authenticated;

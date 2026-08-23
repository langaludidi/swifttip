-- SwiftTip MVP v3 — operational Venue member invitation by email.
-- The Auth identity must already exist. This avoids UUID copy/paste while keeping
-- Venue membership invitation-based and Admin/AAL2 controlled.

create or replace function public.admin_invite_venue_member_by_email(
  p_venue_id uuid,
  p_email text,
  p_role text default 'venue_admin'
)
returns uuid
language plpgsql
security definer
set search_path = public, private, auth, pg_temp
as $$
declare
  v_email text := lower(nullif(trim(p_email), ''));
  v_user_id uuid;
  v_venue_status text;
begin
  perform private.require_admin_role(array['operations_admin','super_admin']);

  if v_email is null or position('@' in v_email) < 2 then
    raise exception 'A valid Venue user email is required';
  end if;

  if p_role not in ('venue_admin','venue_viewer') then
    raise exception 'Invalid Venue role';
  end if;

  select venue_status into v_venue_status
  from public.venues
  where id = p_venue_id;

  if v_venue_status is null then
    raise exception 'Venue not found';
  end if;

  if v_venue_status <> 'active' then
    raise exception 'Venue must be active before members can be invited';
  end if;

  select id into v_user_id
  from auth.users
  where lower(email) = v_email
  limit 1;

  if v_user_id is null then
    raise exception 'No SwiftTip account exists for this email yet. Ask the Venue user to sign in once, then retry';
  end if;

  return public.admin_invite_venue_member(p_venue_id, v_user_id, p_role);
end;
$$;

revoke all on function public.admin_invite_venue_member_by_email(uuid,text,text) from public;
revoke all on function public.admin_invite_venue_member_by_email(uuid,text,text) from anon;
grant execute on function public.admin_invite_venue_member_by_email(uuid,text,text) to authenticated;

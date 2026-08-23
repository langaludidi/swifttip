-- SwiftTip MVP v3 — canonical in-app operational notifications.
-- External SMS/email delivery remains out of scope until providers are configured.

alter table public.notifications
  add column if not exists title text,
  add column if not exists body text,
  add column if not exists action_path text,
  add column if not exists read_at timestamptz,
  add column if not exists dedupe_key text;

create unique index if not exists notifications_dedupe_key_idx
  on public.notifications(dedupe_key)
  where dedupe_key is not null;

create index if not exists notifications_recipient_created_idx
  on public.notifications(recipient_user_id,created_at desc)
  where recipient_user_id is not null;

create or replace function private.create_in_app_notification(
  p_recipient_user_id uuid,
  p_notification_type text,
  p_title text,
  p_body text,
  p_related_entity_type text default null,
  p_related_entity_id uuid default null,
  p_action_path text default null,
  p_dedupe_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_id uuid;
begin
  if p_recipient_user_id is null then return null; end if;
  if nullif(trim(p_notification_type),'') is null or nullif(trim(p_title),'') is null then
    raise exception 'Notification type and title are required';
  end if;

  insert into public.notifications(
    recipient_user_id,notification_type,related_entity_type,related_entity_id,
    channel,notification_status,sent_at,title,body,action_path,dedupe_key
  ) values (
    p_recipient_user_id,trim(p_notification_type),nullif(trim(p_related_entity_type),''),p_related_entity_id,
    'in_app','sent',now(),trim(p_title),nullif(trim(p_body),''),nullif(trim(p_action_path),''),nullif(trim(p_dedupe_key),'')
  )
  on conflict (dedupe_key) where dedupe_key is not null do nothing
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function private.notify_worker_verification_change()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare v_user_id uuid;
begin
  if tg_op='UPDATE' and new.verification_status is not distinct from old.verification_status then return new; end if;
  select user_id into v_user_id from public.workers where id=new.worker_id;
  perform private.create_in_app_notification(
    v_user_id,'worker_verification_'||new.verification_status,
    case new.verification_status
      when 'approved' then 'Identity verification approved'
      when 'additional_info_required' then 'Identity verification needs more information'
      when 'rejected' then 'Identity verification was not approved'
      when 'under_review' then 'Identity verification is under review'
      else 'Identity verification updated' end,
    'Your SwiftTip identity verification status is now '||replace(new.verification_status,'_',' ')||'.',
    'worker_verification',new.id,'/worker/verification',
    'verification:'||new.id::text||':'||new.verification_status
  );
  return new;
end;
$$;

drop trigger if exists notify_worker_verification_change_trigger on public.worker_verifications;
create trigger notify_worker_verification_change_trigger
after insert or update of verification_status on public.worker_verifications
for each row execute function private.notify_worker_verification_change();

create or replace function private.notify_worker_venue_association_change()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_worker_user_id uuid;
  v_venue_name text;
  v_member record;
begin
  select w.user_id into v_worker_user_id from public.workers w where w.id=new.worker_id;
  select coalesce(v.branch_name,v.trading_name) into v_venue_name from public.venues v where v.id=new.venue_id;

  if tg_op='INSERT' and new.association_status='pending' then
    for v_member in
      select vm.user_id from public.venue_memberships vm
      where vm.venue_id=new.venue_id and vm.membership_status='active' and vm.venue_role='venue_admin'
    loop
      perform private.create_in_app_notification(
        v_member.user_id,'worker_venue_confirmation_requested','Worker confirmation requested',
        'A Worker has asked '||coalesce(v_venue_name,'your Venue')||' to confirm their current work relationship.',
        'worker_venue_association',new.id,'/venue/workers/'||new.id::text,
        'venue-association-admin:'||new.id::text||':pending:'||v_member.user_id::text
      );
    end loop;
  end if;

  if tg_op='UPDATE' and new.association_status is distinct from old.association_status then
    perform private.create_in_app_notification(
      v_worker_user_id,'worker_venue_'||new.association_status,
      case new.association_status
        when 'verified' then 'Venue relationship confirmed'
        when 'rejected' then 'Venue confirmation was declined'
        when 'suspended' then 'Venue relationship suspended'
        when 'ended' then 'Venue relationship ended'
        else 'Venue relationship updated' end,
      coalesce(v_venue_name,'Your Venue')||' relationship is now '||replace(new.association_status,'_',' ')||'.',
      'worker_venue_association',new.id,'/worker/onboarding',
      'venue-association-worker:'||new.id::text||':'||new.association_status
    );
  end if;
  return new;
end;
$$;

drop trigger if exists notify_worker_venue_association_change_trigger on public.worker_venue_associations;
create trigger notify_worker_venue_association_change_trigger
after insert or update of association_status on public.worker_venue_associations
for each row execute function private.notify_worker_venue_association_change();

create or replace function private.notify_venue_membership_invitation()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare v_venue_name text;
begin
  if new.membership_status='invited' and (tg_op='INSERT' or new.membership_status is distinct from old.membership_status) then
    select coalesce(branch_name,trading_name) into v_venue_name from public.venues where id=new.venue_id;
    perform private.create_in_app_notification(
      new.user_id,'venue_membership_invited','SwiftTip Venue invitation',
      'You have been invited to '||coalesce(v_venue_name,'a SwiftTip Venue')||'.',
      'venue_membership',new.id,'/venue/onboarding',
      'venue-membership:'||new.id::text||':invited'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists notify_venue_membership_invitation_trigger on public.venue_memberships;
create trigger notify_venue_membership_invitation_trigger
after insert or update of membership_status on public.venue_memberships
for each row execute function private.notify_venue_membership_invitation();

create or replace function private.notify_support_case_change()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if new.requester_user_id is null then return new; end if;
  if tg_op='UPDATE' and new.case_status is distinct from old.case_status then
    perform private.create_in_app_notification(
      new.requester_user_id,'support_case_'||new.case_status,
      'Support case '||new.case_reference||' updated',
      'Your support case status is now '||replace(new.case_status,'_',' ')||'.',
      'support_case',new.id,
      case when new.requester_type='worker' then '/worker/support' else null end,
      'support:'||new.id::text||':'||new.case_status
    );
  end if;
  return new;
end;
$$;

drop trigger if exists notify_support_case_change_trigger on public.support_cases;
create trigger notify_support_case_change_trigger
after update of case_status on public.support_cases
for each row execute function private.notify_support_case_change();

create or replace function private.notify_worker_settlement_change()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_user_id uuid;
  v_tip_reference text;
begin
  if tg_op='UPDATE' and new.settlement_state is not distinct from old.settlement_state then return new; end if;
  if new.settlement_state not in ('succeeded','failed','held','exception','reversed') then return new; end if;

  select w.user_id,t.swifttip_reference into v_user_id,v_tip_reference
  from public.financial_allocations fa
  join public.workers w on w.id=fa.worker_id
  join public.tips t on t.id=fa.tip_id
  where fa.id=new.allocation_id and fa.allocation_type='worker_net';

  perform private.create_in_app_notification(
    v_user_id,'worker_settlement_'||new.settlement_state,
    case new.settlement_state
      when 'succeeded' then 'Tip settlement completed'
      when 'failed' then 'Tip settlement needs attention'
      when 'held' then 'Tip settlement is on hold'
      when 'exception' then 'Tip settlement needs review'
      when 'reversed' then 'Tip settlement was reversed'
      else 'Tip settlement updated' end,
    case when v_tip_reference is null then 'Your Settlement status changed.' else 'Settlement for '||v_tip_reference||' is now '||replace(new.settlement_state,'_',' ')||'.' end,
    'settlement',new.id,
    case when v_tip_reference is null then '/worker/transactions' else '/worker/transactions/'||v_tip_reference end,
    'settlement:'||new.id::text||':'||new.settlement_state
  );
  return new;
end;
$$;

drop trigger if exists notify_worker_settlement_change_trigger on public.settlements;
create trigger notify_worker_settlement_change_trigger
after insert or update of settlement_state on public.settlements
for each row execute function private.notify_worker_settlement_change();

create or replace function public.get_my_notifications(p_limit integer default 50)
returns table(
  notification_id uuid,
  notification_type text,
  title text,
  body text,
  action_path text,
  read_at timestamptz,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  return query
  select n.id,n.notification_type,n.title,n.body,n.action_path,n.read_at,n.created_at
  from public.notifications n
  where n.recipient_user_id=auth.uid() and n.channel='in_app' and n.notification_status='sent'
  order by n.created_at desc
  limit greatest(1,least(coalesce(p_limit,50),100));
end;
$$;

create or replace function public.mark_my_notification_read(p_notification_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  update public.notifications set read_at=coalesce(read_at,now())
  where id=p_notification_id and recipient_user_id=auth.uid() and channel='in_app';
  if not found then raise exception 'Notification not found'; end if;
end;
$$;

revoke all on function private.create_in_app_notification(uuid,text,text,text,text,uuid,text,text) from public,anon,authenticated;
revoke all on function private.notify_worker_verification_change() from public,anon,authenticated;
revoke all on function private.notify_worker_venue_association_change() from public,anon,authenticated;
revoke all on function private.notify_venue_membership_invitation() from public,anon,authenticated;
revoke all on function private.notify_support_case_change() from public,anon,authenticated;
revoke all on function private.notify_worker_settlement_change() from public,anon,authenticated;
revoke all on function public.get_my_notifications(integer) from public,anon;
revoke all on function public.mark_my_notification_read(uuid) from public,anon;
grant execute on function public.get_my_notifications(integer) to authenticated;
grant execute on function public.mark_my_notification_read(uuid) to authenticated;

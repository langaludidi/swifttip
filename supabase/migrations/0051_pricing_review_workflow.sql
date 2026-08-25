-- SwiftTip MVP v3 — controlled pricing review workflow.
-- This migration deliberately exposes no scheduling or activation mutation.

alter table public.pricing_versions
  add column if not exists review_status text not null default 'draft',
  add column if not exists review_notes text,
  add column if not exists commercial_blockers jsonb not null default '[]'::jsonb,
  add column if not exists submitted_for_review_at timestamptz,
  add column if not exists submitted_by_user_id uuid references auth.users(id) on delete restrict,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by_user_id uuid references auth.users(id) on delete restrict,
  add column if not exists approved_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

alter table public.pricing_versions drop constraint if exists pricing_versions_review_status_check;
alter table public.pricing_versions add constraint pricing_versions_review_status_check
  check (review_status in ('draft','under_review','approved'));

alter table public.pricing_versions drop constraint if exists pricing_versions_commercial_blockers_array_check;
alter table public.pricing_versions add constraint pricing_versions_commercial_blockers_array_check
  check (jsonb_typeof(commercial_blockers) = 'array');

alter table public.pricing_versions drop constraint if exists pricing_versions_activation_requires_approval_check;
alter table public.pricing_versions add constraint pricing_versions_activation_requires_approval_check
  check (pricing_status not in ('scheduled','active') or review_status = 'approved');

-- Preserve the current figures as a working draft, but make the unresolved
-- commercial decisions explicit so they cannot accidentally be approved.
update public.pricing_versions
set commercial_blockers = jsonb_build_array(
      'Confirm payment-provider fee schedule, split settlement and payout costs',
      'Confirm VAT and tax treatment, including invoice wording',
      'Obtain commercial and legal approval for the proposed customer fee',
      'Obtain commercial and legal approval for the proposed Worker fee',
      'Agree refund, chargeback and post-settlement loss allocation',
      'Validate unit economics and contribution at minimum, typical and maximum Tip values',
      'Approve final minimum, maximum and high-value review thresholds',
      'Confirm consistency with operative terms and checkout disclosures'
    ),
    review_notes = coalesce(
      review_notes,
      'Working figures only. They are not approved, scheduled, active or available for charging.'
    )
where version_code = 'v3-working-001'
  and pricing_status = 'draft'
  and review_status = 'draft'
  and commercial_blockers = '[]'::jsonb;

create or replace function private.guard_pricing_review_workflow()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  new.updated_at := now();

  if new.high_value_threshold_cents < new.minimum_gratuity_cents
     or new.high_value_threshold_cents > new.maximum_gratuity_cents then
    raise exception 'High-value threshold must fall within the configured gratuity range';
  end if;

  if new.review_status = 'approved' then
    if jsonb_array_length(new.commercial_blockers) <> 0 then
      raise exception 'Pricing cannot be approved while commercial blockers remain';
    end if;
    if new.submitted_for_review_at is null or new.reviewed_at is null then
      raise exception 'Pricing must be submitted and formally reviewed before approval';
    end if;
  end if;

  if new.pricing_status in ('scheduled','active') then
    if new.review_status <> 'approved' or new.approved_at is null or new.approved_by is null then
      raise exception 'Only approved pricing can be scheduled or activated';
    end if;
    if new.effective_from is null then
      raise exception 'Scheduled or active pricing requires an effective date';
    end if;
  end if;

  if tg_op = 'UPDATE' and old.review_status = 'approved' then
    if new.worker_fee_bps is distinct from old.worker_fee_bps
       or new.customer_fixed_fee_cents is distinct from old.customer_fixed_fee_cents
       or new.customer_fee_bps is distinct from old.customer_fee_bps
       or new.customer_fee_cap_cents is distinct from old.customer_fee_cap_cents
       or new.minimum_gratuity_cents is distinct from old.minimum_gratuity_cents
       or new.maximum_gratuity_cents is distinct from old.maximum_gratuity_cents
       or new.high_value_threshold_cents is distinct from old.high_value_threshold_cents
       or new.currency is distinct from old.currency
       or new.version_code is distinct from old.version_code then
      raise exception 'Approved pricing must be returned to draft before editing';
    end if;
  end if;

  if tg_op = 'UPDATE' and old.pricing_status in ('active','retired') then
    if new.worker_fee_bps is distinct from old.worker_fee_bps
       or new.customer_fixed_fee_cents is distinct from old.customer_fixed_fee_cents
       or new.customer_fee_bps is distinct from old.customer_fee_bps
       or new.customer_fee_cap_cents is distinct from old.customer_fee_cap_cents
       or new.minimum_gratuity_cents is distinct from old.minimum_gratuity_cents
       or new.maximum_gratuity_cents is distinct from old.maximum_gratuity_cents
       or new.high_value_threshold_cents is distinct from old.high_value_threshold_cents
       or new.currency is distinct from old.currency
       or new.version_code is distinct from old.version_code then
      raise exception 'Active or retired pricing is immutable';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists guard_pricing_review_workflow_trigger on public.pricing_versions;
create trigger guard_pricing_review_workflow_trigger
before insert or update on public.pricing_versions
for each row execute function private.guard_pricing_review_workflow();

drop function if exists public.admin_get_pricing_versions();

create function public.admin_get_pricing_versions()
returns table (
  pricing_id uuid,
  version_code text,
  pricing_status text,
  review_status text,
  blocker_count integer,
  effective_from timestamptz,
  effective_until timestamptz,
  worker_fee_bps integer,
  customer_fixed_fee_cents bigint,
  customer_fee_bps integer,
  customer_fee_cap_cents bigint,
  minimum_gratuity_cents bigint,
  maximum_gratuity_cents bigint,
  high_value_threshold_cents bigint,
  currency char(3),
  submitted_for_review_at timestamptz,
  reviewed_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, private
as $$
begin
  perform private.require_admin_role(array['operations_admin','finance_admin','super_admin']);
  return query
  select p.id,p.version_code,p.pricing_status,p.review_status,
         jsonb_array_length(p.commercial_blockers)::integer,p.effective_from,p.effective_until,
         p.worker_fee_bps,p.customer_fixed_fee_cents,p.customer_fee_bps,p.customer_fee_cap_cents,
         p.minimum_gratuity_cents,p.maximum_gratuity_cents,p.high_value_threshold_cents,p.currency,
         p.submitted_for_review_at,p.reviewed_at,p.approved_at,p.created_at,p.updated_at
  from public.pricing_versions p
  order by p.created_at desc;
end;
$$;

create or replace function public.admin_get_pricing_version(p_pricing_version_id uuid)
returns table (
  pricing_id uuid,
  version_code text,
  pricing_status text,
  review_status text,
  review_notes text,
  commercial_blockers jsonb,
  effective_from timestamptz,
  effective_until timestamptz,
  worker_fee_bps integer,
  customer_fixed_fee_cents bigint,
  customer_fee_bps integer,
  customer_fee_cap_cents bigint,
  minimum_gratuity_cents bigint,
  maximum_gratuity_cents bigint,
  high_value_threshold_cents bigint,
  currency char(3),
  submitted_for_review_at timestamptz,
  reviewed_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, private
as $$
begin
  perform private.require_admin_role(array['operations_admin','finance_admin','super_admin']);
  return query
  select p.id,p.version_code,p.pricing_status,p.review_status,p.review_notes,p.commercial_blockers,
         p.effective_from,p.effective_until,p.worker_fee_bps,p.customer_fixed_fee_cents,
         p.customer_fee_bps,p.customer_fee_cap_cents,p.minimum_gratuity_cents,p.maximum_gratuity_cents,
         p.high_value_threshold_cents,p.currency,p.submitted_for_review_at,p.reviewed_at,p.approved_at,
         p.created_at,p.updated_at
  from public.pricing_versions p
  where p.id = p_pricing_version_id;
end;
$$;

create or replace function public.admin_update_pricing_draft(
  p_pricing_version_id uuid,
  p_worker_fee_bps integer,
  p_customer_fixed_fee_cents bigint,
  p_customer_fee_bps integer,
  p_customer_fee_cap_cents bigint,
  p_minimum_gratuity_cents bigint,
  p_maximum_gratuity_cents bigint,
  p_high_value_threshold_cents bigint,
  p_commercial_blockers jsonb,
  p_review_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public, private, audit
as $$
declare
  v_previous jsonb;
begin
  perform private.require_admin_role(array['finance_admin','super_admin']);
  if p_commercial_blockers is null or jsonb_typeof(p_commercial_blockers) <> 'array' then
    raise exception 'Commercial blockers must be a JSON array';
  end if;
  if p_worker_fee_bps not between 0 and 10000 or p_customer_fee_bps not between 0 and 10000 then
    raise exception 'Fee basis points must be between 0 and 10000';
  end if;
  if p_customer_fixed_fee_cents < 0 or (p_customer_fee_cap_cents is not null and p_customer_fee_cap_cents < 0) then
    raise exception 'Customer fees cannot be negative';
  end if;
  if p_minimum_gratuity_cents <= 0 or p_maximum_gratuity_cents < p_minimum_gratuity_cents then
    raise exception 'Invalid gratuity range';
  end if;
  if p_high_value_threshold_cents < p_minimum_gratuity_cents or p_high_value_threshold_cents > p_maximum_gratuity_cents then
    raise exception 'High-value threshold must fall within the gratuity range';
  end if;

  select jsonb_build_object(
    'review_status',review_status,
    'pricing_status',pricing_status,
    'worker_fee_bps',worker_fee_bps,
    'customer_fixed_fee_cents',customer_fixed_fee_cents,
    'customer_fee_bps',customer_fee_bps,
    'customer_fee_cap_cents',customer_fee_cap_cents,
    'minimum_gratuity_cents',minimum_gratuity_cents,
    'maximum_gratuity_cents',maximum_gratuity_cents,
    'high_value_threshold_cents',high_value_threshold_cents,
    'blocker_count',jsonb_array_length(commercial_blockers)
  ) into v_previous
  from public.pricing_versions
  where id = p_pricing_version_id
  for update;

  if v_previous is null then raise exception 'Pricing version not found'; end if;
  if (select pricing_status from public.pricing_versions where id=p_pricing_version_id) <> 'draft' then
    raise exception 'Only inactive draft pricing can be edited';
  end if;
  if (select review_status from public.pricing_versions where id=p_pricing_version_id) <> 'draft' then
    raise exception 'Only pricing in draft review status can be edited';
  end if;

  update public.pricing_versions
  set worker_fee_bps=p_worker_fee_bps,
      customer_fixed_fee_cents=p_customer_fixed_fee_cents,
      customer_fee_bps=p_customer_fee_bps,
      customer_fee_cap_cents=p_customer_fee_cap_cents,
      minimum_gratuity_cents=p_minimum_gratuity_cents,
      maximum_gratuity_cents=p_maximum_gratuity_cents,
      high_value_threshold_cents=p_high_value_threshold_cents,
      commercial_blockers=p_commercial_blockers,
      review_notes=nullif(trim(p_review_notes),''),
      submitted_for_review_at=null,
      submitted_by_user_id=null,
      reviewed_at=null,
      reviewed_by_user_id=null,
      approved_at=null,
      approved_by=null
  where id=p_pricing_version_id;

  insert into audit.audit_events(actor_type,actor_user_id,actor_role,action,entity_type,entity_id,previous_state,resulting_state,reason)
  values('admin',auth.uid(),private.current_admin_role(),'pricing_draft_updated','pricing_version',p_pricing_version_id,
         v_previous,jsonb_build_object('review_status','draft','pricing_status','draft','blocker_count',jsonb_array_length(p_commercial_blockers)),nullif(trim(p_review_notes),''));
end;
$$;

create or replace function public.admin_submit_pricing_for_review(
  p_pricing_version_id uuid,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public, private, audit
as $$
declare v_previous jsonb;
begin
  perform private.require_admin_role(array['finance_admin','super_admin']);
  select jsonb_build_object('review_status',review_status,'pricing_status',pricing_status,'blocker_count',jsonb_array_length(commercial_blockers))
    into v_previous from public.pricing_versions where id=p_pricing_version_id for update;
  if v_previous is null then raise exception 'Pricing version not found'; end if;
  if (select pricing_status from public.pricing_versions where id=p_pricing_version_id) <> 'draft'
     or (select review_status from public.pricing_versions where id=p_pricing_version_id) <> 'draft' then
    raise exception 'Only inactive draft pricing can be submitted';
  end if;

  update public.pricing_versions
  set review_status='under_review',
      submitted_for_review_at=now(),
      submitted_by_user_id=auth.uid(),
      reviewed_at=null,
      reviewed_by_user_id=null,
      approved_at=null,
      approved_by=null
  where id=p_pricing_version_id;

  insert into audit.audit_events(actor_type,actor_user_id,actor_role,action,entity_type,entity_id,previous_state,resulting_state,reason)
  values('admin',auth.uid(),private.current_admin_role(),'pricing_submitted_for_review','pricing_version',p_pricing_version_id,
         v_previous,jsonb_build_object('review_status','under_review','pricing_status','draft'),nullif(trim(p_reason),''));
end;
$$;

create or replace function public.admin_record_pricing_review(
  p_pricing_version_id uuid,
  p_commercial_blockers jsonb,
  p_review_notes text
)
returns void
language plpgsql
security definer
set search_path = public, private, audit
as $$
declare v_previous jsonb;
begin
  perform private.require_admin_role(array['super_admin']);
  if p_commercial_blockers is null or jsonb_typeof(p_commercial_blockers) <> 'array' then
    raise exception 'Commercial blockers must be a JSON array';
  end if;
  if p_review_notes is null or length(trim(p_review_notes)) < 3 then
    raise exception 'Review notes are required';
  end if;
  select jsonb_build_object('review_status',review_status,'blocker_count',jsonb_array_length(commercial_blockers))
    into v_previous from public.pricing_versions where id=p_pricing_version_id for update;
  if v_previous is null then raise exception 'Pricing version not found'; end if;
  if (select review_status from public.pricing_versions where id=p_pricing_version_id) <> 'under_review' then
    raise exception 'Pricing is not under review';
  end if;

  update public.pricing_versions
  set commercial_blockers=p_commercial_blockers,review_notes=trim(p_review_notes),reviewed_at=now(),reviewed_by_user_id=auth.uid()
  where id=p_pricing_version_id;

  insert into audit.audit_events(actor_type,actor_user_id,actor_role,action,entity_type,entity_id,previous_state,resulting_state,reason)
  values('admin',auth.uid(),private.current_admin_role(),'pricing_review_recorded','pricing_version',p_pricing_version_id,
         v_previous,jsonb_build_object('review_status','under_review','blocker_count',jsonb_array_length(p_commercial_blockers)),trim(p_review_notes));
end;
$$;

create or replace function public.admin_return_pricing_to_draft(
  p_pricing_version_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public, private, audit
as $$
declare v_previous jsonb;
begin
  perform private.require_admin_role(array['super_admin']);
  if p_reason is null or length(trim(p_reason)) < 3 then raise exception 'Reason is required'; end if;
  select jsonb_build_object('review_status',review_status,'pricing_status',pricing_status,'approved_at',approved_at)
    into v_previous from public.pricing_versions where id=p_pricing_version_id for update;
  if v_previous is null then raise exception 'Pricing version not found'; end if;
  if (select pricing_status from public.pricing_versions where id=p_pricing_version_id) <> 'draft' then
    raise exception 'Scheduled, active or retired pricing cannot return to draft';
  end if;
  if (select review_status from public.pricing_versions where id=p_pricing_version_id) = 'draft' then
    raise exception 'Pricing is already draft';
  end if;

  update public.pricing_versions
  set review_status='draft',
      submitted_for_review_at=null,
      submitted_by_user_id=null,
      reviewed_at=null,
      reviewed_by_user_id=null,
      approved_at=null,
      approved_by=null
  where id=p_pricing_version_id;

  insert into audit.audit_events(actor_type,actor_user_id,actor_role,action,entity_type,entity_id,previous_state,resulting_state,reason)
  values('admin',auth.uid(),private.current_admin_role(),'pricing_returned_to_draft','pricing_version',p_pricing_version_id,
         v_previous,jsonb_build_object('review_status','draft','pricing_status','draft'),trim(p_reason));
end;
$$;

create or replace function public.admin_approve_pricing(
  p_pricing_version_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public, private, audit
as $$
declare v_previous jsonb; v_blockers integer;
begin
  perform private.require_admin_role(array['super_admin']);
  if p_reason is null or length(trim(p_reason)) < 3 then raise exception 'Approval basis is required'; end if;
  select jsonb_build_object('review_status',review_status,'pricing_status',pricing_status,'blocker_count',jsonb_array_length(commercial_blockers)),
         jsonb_array_length(commercial_blockers)
    into v_previous,v_blockers from public.pricing_versions where id=p_pricing_version_id for update;
  if v_previous is null then raise exception 'Pricing version not found'; end if;
  if (select pricing_status from public.pricing_versions where id=p_pricing_version_id) <> 'draft'
     or (select review_status from public.pricing_versions where id=p_pricing_version_id) <> 'under_review' then
    raise exception 'Only inactive pricing under review can be approved';
  end if;
  if v_blockers <> 0 then raise exception 'Commercial blockers must be cleared before approval'; end if;
  if not exists(select 1 from public.pricing_versions where id=p_pricing_version_id and reviewed_at is not null) then
    raise exception 'A recorded commercial review is required before approval';
  end if;

  update public.pricing_versions
  set review_status='approved',approved_at=now(),approved_by=auth.uid()
  where id=p_pricing_version_id;

  insert into audit.audit_events(actor_type,actor_user_id,actor_role,action,entity_type,entity_id,previous_state,resulting_state,reason)
  values('admin',auth.uid(),private.current_admin_role(),'pricing_approved','pricing_version',p_pricing_version_id,
         v_previous,jsonb_build_object('review_status','approved','pricing_status','draft','activated',false),trim(p_reason));
end;
$$;

revoke all on function private.guard_pricing_review_workflow() from public, anon, authenticated;
revoke all on function public.admin_get_pricing_versions() from public, anon;
revoke all on function public.admin_get_pricing_version(uuid) from public, anon;
revoke all on function public.admin_update_pricing_draft(uuid,integer,bigint,integer,bigint,bigint,bigint,bigint,jsonb,text) from public, anon;
revoke all on function public.admin_submit_pricing_for_review(uuid,text) from public, anon;
revoke all on function public.admin_record_pricing_review(uuid,jsonb,text) from public, anon;
revoke all on function public.admin_return_pricing_to_draft(uuid,text) from public, anon;
revoke all on function public.admin_approve_pricing(uuid,text) from public, anon;

grant execute on function public.admin_get_pricing_versions() to authenticated;
grant execute on function public.admin_get_pricing_version(uuid) to authenticated;
grant execute on function public.admin_update_pricing_draft(uuid,integer,bigint,integer,bigint,bigint,bigint,bigint,jsonb,text) to authenticated;
grant execute on function public.admin_submit_pricing_for_review(uuid,text) to authenticated;
grant execute on function public.admin_record_pricing_review(uuid,jsonb,text) to authenticated;
grant execute on function public.admin_return_pricing_to_draft(uuid,text) to authenticated;
grant execute on function public.admin_approve_pricing(uuid,text) to authenticated;

-- ============================================================================
-- Worker suspension/reinstatement lifecycle (approved <-> suspended), plus a
-- database-level guarantee that workers.active can never diverge from
-- workers.status: a BEFORE INSERT OR UPDATE trigger derives it on every
-- write, for every caller, regardless of RLS. Before this migration,
-- decide_kyc() set `active` itself as a matter of convention; after it,
-- nothing sets `active` directly anywhere, including decide_kyc.
--
-- This closes the `active`-specific half of the open "admin-side integrity
-- gap" (docs/production/06-production-checklist.md): even a direct client
-- UPDATE via the "workers admin update" RLS policy (0011) can no longer set
-- `active` independently of `status`, because the trigger overwrites it
-- before the row is stored. It does NOT close the full gap — a direct
-- UPDATE can still change `status` itself without going through decide_kyc,
-- bypassing the reason requirement and the audit_logs row. That remains a
-- separate, open, already-tracked item.
--
-- Status stays an unordered set of labels throughout: every valid transition
-- is listed explicitly by (from, to) pair below. Nothing compares statuses
-- with < / > / >= — 'suspended' and 'rejected' are not points on a scale.
-- ============================================================================

-- ---------- active is derived from status, for every writer, always ----------
create or replace function enforce_worker_active_matches_status()
returns trigger language plpgsql as $$
begin
  new.active := (new.status = 'approved');
  return new;
end; $$;

drop trigger if exists workers_active_derived_from_status on workers;
create trigger workers_active_derived_from_status
  before insert or update on workers
  for each row execute function enforce_worker_active_matches_status();

-- ---------- decide_kyc: add approved<->suspended, stop setting active ----------
create or replace function decide_kyc(p_worker_id uuid, p_decision worker_status, p_reason text, p_actor_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_worker workers%rowtype;
  v_action text;
begin
  select * into v_worker from workers where id = p_worker_id for update;
  if not found then
    raise exception 'worker % not found', p_worker_id;
  end if;

  -- Every valid (from, to) pair, listed explicitly — no ordering implied.
  if v_worker.status in ('submitted', 'under_review') and p_decision = 'approved' then
    v_action := 'approved';
  elsif v_worker.status in ('submitted', 'under_review') and p_decision = 'rejected' then
    v_action := 'rejected';
  elsif v_worker.status = 'approved' and p_decision = 'suspended' then
    v_action := 'suspended';
  elsif v_worker.status = 'suspended' and p_decision = 'approved' then
    v_action := 'reinstated';
  else
    raise exception 'cannot go from % to %', v_worker.status, p_decision;
  end if;

  if v_action in ('rejected', 'suspended', 'reinstated') and (p_reason is null or btrim(p_reason) = '') then
    raise exception '% requires a reason', v_action;
  end if;

  update workers set
    status = p_decision,
    reviewed_at = now(),
    rejection_reason = case when p_decision = 'rejected' then p_reason else null end
  where id = p_worker_id;
  -- `active` is deliberately absent from this SET list — the trigger above
  -- derives it from the `status` value this same UPDATE just wrote.

  insert into audit_logs (actor_id, action, target_type, target_id, detail)
  values (p_actor_id, 'kyc_' || v_action, 'worker', p_worker_id, jsonb_build_object('reason', p_reason));
end; $$;

revoke execute on function decide_kyc(uuid, worker_status, text, uuid) from public, anon, authenticated;

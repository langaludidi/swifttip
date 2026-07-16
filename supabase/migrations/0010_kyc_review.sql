-- ============================================================================
-- Admin audit log — records who did what, to whom, when. Distinct from
-- ledger_entries (which tracks money movements, not admin actions). Writes
-- only via security-definer functions using the service role; no client
-- INSERT/UPDATE/DELETE policy exists.
-- ============================================================================
create table public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid not null references auth.users(id),
  action      text not null,
  target_type text not null,
  target_id   uuid not null,
  detail      jsonb,
  created_at  timestamptz not null default now()
);

create index idx_audit_logs_target on public.audit_logs (target_type, target_id);
create index idx_audit_logs_actor  on public.audit_logs (actor_id, created_at desc);

alter table public.audit_logs enable row level security;

create policy "audit_logs admin read" on public.audit_logs
  for select using (auth_role() = 'admin');

-- ============================================================================
-- decide_kyc(worker_id, decision, reason, actor_id) — the ONLY code path
-- allowed to set workers.active = true. Mirrors settle_tip()'s shape: lock
-- the row, validate, mutate status/active/reviewed_at/rejection_reason and
-- write the audit log, all in one transaction. Only the service role can
-- call this (revoked from public/anon/authenticated below) — review-kyc is
-- the sole caller, after its own admin check.
-- ============================================================================
create or replace function decide_kyc(p_worker_id uuid, p_decision worker_status, p_reason text, p_actor_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_worker workers%rowtype;
begin
  select * into v_worker from workers where id = p_worker_id for update;
  if not found then
    raise exception 'worker % not found', p_worker_id;
  end if;
  if v_worker.status not in ('submitted', 'under_review') then
    raise exception 'cannot decide from status %', v_worker.status;
  end if;
  if p_decision not in ('approved', 'rejected') then
    raise exception 'invalid decision %', p_decision;
  end if;
  if p_decision = 'rejected' and (p_reason is null or btrim(p_reason) = '') then
    raise exception 'rejection requires a reason';
  end if;

  update workers set
    status = p_decision,
    active = (p_decision = 'approved'),
    reviewed_at = now(),
    rejection_reason = case when p_decision = 'rejected' then p_reason else null end
  where id = p_worker_id;

  insert into audit_logs (actor_id, action, target_type, target_id, detail)
  values (p_actor_id, 'kyc_' || p_decision, 'worker', p_worker_id, jsonb_build_object('reason', p_reason));
end; $$;

revoke execute on function decide_kyc(uuid, worker_status, text, uuid) from public, anon, authenticated;

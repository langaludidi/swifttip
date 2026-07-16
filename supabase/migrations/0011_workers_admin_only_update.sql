-- ============================================================================
-- C5: "workers employer or admin update" let ANY employer owner directly
-- UPDATE their own workers' active/status/rejection_reason/reviewed_at columns
-- with no validation, no reason requirement, and no audit trail — bypassing
-- decide_kyc() entirely. Live-proven exploitable with a throwaway account and
-- only the anon key: self-insert an employers row (owner_id = self; "employers
-- insert own" already allowed this), self-insert a workers row attached to it
-- (employer_id = the self-owned employer — the workers INSERT policy never
-- constrains employer_id), then PATCH that worker's active to true directly.
-- Self-approval with zero KYC, reachable by anyone with an email address.
--
-- Employer self-service is deferred to pilot #2 (CLAUDE.md / 01-mvp-scope.md)
-- and nothing in the current codebase calls this employer path today —
-- setWorkerActive (src/services/workers.js) has exactly one caller anywhere,
-- the admin console. Dropping the employer clause is a pure narrowing with
-- zero functional regression today. When employer self-service is actually
-- built, whatever grant it needs should be scoped to that feature specifically,
-- not resurrected as a blanket table UPDATE.
--
-- This does NOT fix the remaining admin-side gap: an admin can still bypass
-- decide_kyc() via a direct client update (no reason required, no audit_logs
-- row written). That's a separate, lower-severity integrity gap, tracked in
-- 06-production-checklist.md, not fixed by this migration.
-- ============================================================================
drop policy if exists "workers employer or admin update" on workers;

create policy "workers admin update" on workers
  for update using (auth_role() = 'admin');

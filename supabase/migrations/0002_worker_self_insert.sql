-- ============================================================================
-- Workers need to create their own row at signup. There was no INSERT policy
-- on `workers`, so every client-side signup insert was silently rejected by
-- RLS (denied by default with RLS enabled and no matching policy).
-- ============================================================================
create policy "workers insert self" on workers
  for insert with check (profile_id = auth.uid());

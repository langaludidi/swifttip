-- ============================================================================
-- The `kyc` storage bucket and its upload policy already existed live on the
-- server but were never captured in a migration — created by hand at some
-- point before this migration history existed. Same class of drift as the
-- settle_tip incident: if this environment were ever rebuilt from migrations,
-- the bucket would silently not exist. This makes the current live state the
-- source of truth in the repo, idempotently (safe to run whether or not the
-- bucket already exists).
--
-- Deliberately private, and deliberately no SELECT policy: KYC documents are
-- readable only via a service-role signed URL from a controlled function
-- (review-kyc), never listed or read directly by any client, including the
-- uploading worker.
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('kyc', 'kyc', false)
on conflict (id) do nothing;

drop policy if exists "kyc upload own folder" on storage.objects;
create policy "kyc upload own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'kyc' and (storage.foldername(name))[1] = auth.uid()::text);

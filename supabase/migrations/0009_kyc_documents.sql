-- ============================================================================
-- KYC document submission log. Tracks metadata (type + storage path) per
-- uploaded file — not the file content itself, which stays in the private
-- `kyc` bucket. No status column here: review outcomes belong to the worker
-- as a whole (workers.status), not to individual documents.
-- ============================================================================
create table public.kyc_documents (
  id            uuid primary key default gen_random_uuid(),
  worker_id     uuid not null references public.workers(id) on delete cascade,
  document_type text not null,
  storage_path  text not null,
  uploaded_at   timestamptz not null default now()
);

create index idx_kyc_documents_worker on public.kyc_documents (worker_id);

alter table public.kyc_documents enable row level security;

-- SELECT here is metadata only (type + path string) — not file content.
-- File bytes remain readable only via a service-role signed URL from
-- review-kyc; this policy does not grant any access to the storage bucket.
create policy "kyc_documents own or admin" on public.kyc_documents
  for select using (
    auth_role() = 'admin'
    or worker_id in (select id from public.workers where profile_id = auth.uid())
  );

create policy "kyc_documents insert self" on public.kyc_documents
  for insert with check (
    worker_id in (select id from public.workers where profile_id = auth.uid())
  );

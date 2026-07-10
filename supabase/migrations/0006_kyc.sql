-- ============================================================================
-- 0006 — FICA / KYC pipeline
-- Worker document/selfie + bank verification, reviewed by an admin. Documents
-- live in a private Storage bucket; only last-4 of ID/account are kept in the
-- table. Decisions run server-side via the review-kyc Edge Function (service
-- role) which flips workers.verified. Run after 0005.
-- ============================================================================

-- workers gain a verification flag (safe if it already exists)
alter table workers add column if not exists verified boolean not null default false;

create table if not exists kyc_submissions (
  id               uuid primary key default gen_random_uuid(),
  worker_id        uuid references workers(id) on delete cascade,
  full_name        text,
  id_type          text not null,                 -- 'said' | 'passport'
  id_number_last4  text,                          -- store ONLY last 4, never the full ID
  doc_path         text,                          -- path in the private 'kyc' bucket
  selfie_path      text,
  bank_name        text,
  bank_acct_last4  text,
  status           text not null default 'pending',   -- pending | approved | rejected
  risk             text not null default 'low',        -- low | review
  reviewer_id      uuid,
  reason           text,
  decided_at       timestamptz,
  created_at       timestamptz not null default now()
);

alter table kyc_submissions enable row level security;

-- Worker can create + read their own submissions; admins can read all.
-- (status changes happen only via the service role in review-kyc.)
create policy "kyc insert own" on kyc_submissions for insert
  with check (worker_id in (select id from workers where profile_id = auth.uid()));
create policy "kyc read own or admin" on kyc_submissions for select using (
  auth_role() = 'admin'
  or worker_id in (select id from workers where profile_id = auth.uid())
);

-- Private storage bucket for KYC documents.
insert into storage.buckets (id, name, public)
values ('kyc', 'kyc', false)
on conflict (id) do nothing;

-- Authenticated users upload into a folder named by their uid: kyc/<uid>/...
create policy "kyc upload own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'kyc' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "kyc read own or admin" on storage.objects for select to authenticated
  using (bucket_id = 'kyc' and ((storage.foldername(name))[1] = auth.uid()::text or auth_role() = 'admin'));

-- Admin decision applied atomically (called by the review-kyc Edge Function).
create or replace function decide_kyc(p_id uuid, p_status text, p_reviewer uuid, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_worker uuid;
begin
  update kyc_submissions
     set status = p_status, reviewer_id = p_reviewer, reason = p_reason, decided_at = now()
   where id = p_id
   returning worker_id into v_worker;
  if p_status = 'approved' and v_worker is not null then
    update workers set verified = true where id = v_worker;
  elsif p_status = 'rejected' and v_worker is not null then
    update workers set verified = false where id = v_worker;
  end if;
end; $$;

revoke all on function decide_kyc(uuid, text, uuid, text) from anon, authenticated;

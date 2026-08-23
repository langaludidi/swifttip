-- SwiftTip MVP v3 — expose physical evidence availability to Verification Admin review.
-- Read-only projection; no evidence or decision mutation is added here.

drop function if exists public.admin_get_verification_detail(uuid);

create function public.admin_get_verification_detail(p_verification_id uuid)
returns table (
  verification_id uuid,
  worker_id uuid,
  legal_first_name text,
  legal_last_name text,
  display_name text,
  verification_type text,
  verification_status text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  decision_reason text,
  venue_name text,
  document_id uuid,
  storage_path text,
  document_type text,
  mime_type text,
  file_size_bytes bigint,
  uploaded_at timestamptz,
  storage_object_available boolean
)
language plpgsql
stable
security definer
set search_path = public, private, storage
as $$
begin
  perform private.require_admin_role(array['verification_admin','super_admin']);

  return query
  select
    wv.id,
    w.id,
    w.legal_first_name,
    w.legal_last_name,
    w.display_first_name,
    wv.verification_type,
    wv.verification_status,
    wv.submitted_at,
    wv.reviewed_at,
    wv.decision_reason,
    coalesce(v.branch_name, v.trading_name),
    vd.id,
    vd.storage_path,
    vd.document_type,
    vd.mime_type,
    vd.file_size_bytes,
    vd.uploaded_at,
    case when vd.id is null then null else exists (
      select 1
      from storage.objects o
      where o.bucket_id='worker-verification'
        and o.name=vd.storage_path
        and o.id=vd.storage_object_id
        and o.archived_at is null
        and coalesce(o.is_delete_marker,false)=false
    ) end
  from public.worker_verifications wv
  join public.workers w on w.id = wv.worker_id
  left join public.worker_venue_associations a
    on a.worker_id = w.id and a.ended_at is null
  left join public.venues v on v.id = a.venue_id
  left join private.verification_documents vd
    on vd.verification_id = wv.id and vd.deleted_at is null
  where wv.id = p_verification_id
  order by vd.uploaded_at nulls last;
end;
$$;

revoke all on function public.admin_get_verification_detail(uuid) from public, anon;
grant execute on function public.admin_get_verification_detail(uuid) to authenticated;

-- SwiftTip MVP v3 — strengthen the controlled Venue Terms draft and expose
-- repository provenance to authorised legal reviewers.
-- This migration does not approve, publish or activate any legal document.

do $$
declare
  v_id uuid;
  v_body text;
  v_hash text;
begin
  select id, content_body
    into v_id, v_body
  from public.terms_versions
  where terms_type = 'venue_terms'
    and version_code = 'v0.1-draft'
    and review_status = 'draft'
    and published_at is null
  for update;

  if v_id is null then
    raise exception 'Editable Venue Terms v0.1 draft not found';
  end if;

  v_body := replace(
    v_body,
    'The Venue is responsible for ensuring that persons acting as Venue Users are appropriately authorised by the Venue.' || E'\n',
    'The Venue is responsible for ensuring that persons acting as Venue Users are appropriately authorised by the Venue.' || E'\n\n' ||
    'Each person accepting these Terms or administering a Venue account represents that they have authority to bind the Venue or to perform the specific administrative action concerned. The Venue must promptly remove or ask SwiftTip to remove access when a Venue User leaves, changes role or is no longer authorised. Shared accounts and credential sharing are prohibited.' || E'\n'
  );

  v_body := replace(
    v_body,
    'The Venue must not confirm a Worker it knows or reasonably believes does not have the stated current relationship with the Venue.' || E'\n',
    'The Venue must not confirm a Worker it knows or reasonably believes does not have the stated current relationship with the Venue.' || E'\n\n' ||
    'Before confirming an association, the Venue User must compare the Worker name, profile image where available, stated role and other limited confirmation information shown by SwiftTip with information the Venue can reasonably verify. The Venue must reject or escalate a request where the person is unknown, the details materially conflict, or the request appears to impersonate another Worker. Confirmation does not transfer SwiftTip''s identity-verification duty to the Venue.' || E'\n'
  );

  v_body := replace(
    v_body,
    'SwiftTip should not request unrelated employment or personal information merely because a support case exists.' || E'\n',
    'SwiftTip should not request unrelated employment or personal information merely because a support case exists.' || E'\n\n' ||
    'The Venue must promptly notify SwiftTip after discovering suspected account compromise, unauthorised access, QR substitution, false Worker association or loss of SwiftTip information. It must preserve relevant evidence, avoid altering audit records and take reasonable containment steps requested by SwiftTip. This cooperation does not require disclosure of information that is unrelated, legally privileged or unlawful to disclose.' || E'\n'
  );

  v_body := replace(
    v_body,
    'Each party must comply with applicable South African privacy and data-protection obligations for personal information for which it is responsible.' || E'\n',
    'Each party must comply with applicable South African privacy and data-protection obligations for personal information for which it is responsible.' || E'\n\n' ||
    'The Venue must limit access to SwiftTip personal information to authorised persons with a genuine operational need, use it only for the permitted Venue functions, keep it reasonably secure, and not create or retain copies beyond what is necessary and lawful. Suspected compromise of personal information must be reported to SwiftTip without undue delay so that the parties can assess and meet their respective notification duties.' || E'\n'
  );

  v_body := replace(
    v_body,
    'SwiftTip records the exact version accepted, the relevant Venue membership, time of acceptance and audit evidence. The accepted version must be available for later review.' || E'\n',
    'SwiftTip records the exact version accepted, the relevant Venue membership, time of acceptance and audit evidence. The accepted version must be available for later review.' || E'\n\n' ||
    'The parties intend electronic records, notices and acceptance actions to have legal effect to the extent permitted by the Electronic Communications and Transactions Act 25 of 2002. A Venue must keep its authorised contact details current. This clause does not remove any signature, delivery or formality that applicable law requires for a particular notice or transaction.' || E'\n'
  );

  v_hash := encode(extensions.digest(convert_to(v_body, 'UTF8'), 'sha256'), 'hex');
  if v_hash <> '39394f9ce5bff2aab37fc4a8b6b12cd7e5c7449f8039929fe9521447685f5989' then
    raise exception 'Venue Terms source synchronisation failed: unexpected content hash %', v_hash;
  end if;

  update public.terms_versions
  set content_body = v_body,
      content_hash = v_hash,
      review_notes = 'Pre-live Venue draft strengthened for authorised-user, Worker-association, incident-response, POPIA and ECTA review. Not approved or published.',
      source_repository = 'langaludidi/swifttip',
      source_path = 'docs/legal/VENUE_TERMS_DRAFT.md',
      source_blob_sha = '2303d0d9666e318fee3a5fb80c6ea059e4b789c7',
      source_bytes = 14217,
      source_synced_at = now()
  where id = v_id;
end $$;

-- PostgreSQL cannot change a function's TABLE return type with CREATE OR REPLACE.
drop function if exists public.admin_get_legal_document(uuid);

create function public.admin_get_legal_document(p_terms_version_id uuid)
returns table(
  terms_version_id uuid,
  terms_type text,
  version_code text,
  title text,
  content_body text,
  content_format text,
  content_hash text,
  review_status text,
  review_notes text,
  legal_blockers jsonb,
  published_at timestamptz,
  effective_from timestamptz,
  submitted_for_review_at timestamptz,
  reviewed_at timestamptz,
  approved_at timestamptz,
  updated_at timestamptz,
  source_repository text,
  source_path text,
  source_blob_sha text,
  source_bytes bigint,
  source_synced_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, private
as $$
begin
  perform private.require_admin_role(array['operations_admin','super_admin']);
  return query
  select tv.id,tv.terms_type,tv.version_code,tv.title,tv.content_body,tv.content_format,tv.content_hash,
         tv.review_status,tv.review_notes,tv.legal_blockers,tv.published_at,tv.effective_from,
         tv.submitted_for_review_at,tv.reviewed_at,tv.approved_at,tv.updated_at,
         tv.source_repository,tv.source_path,tv.source_blob_sha,tv.source_bytes,tv.source_synced_at
  from public.terms_versions tv
  where tv.id = p_terms_version_id;
end;
$$;

revoke all on function public.admin_get_legal_document(uuid) from public, anon;
grant execute on function public.admin_get_legal_document(uuid) to authenticated;


-- SwiftTip MVP v3 — isolate legal versions from direct PostgREST table access.
-- Public/Worker/Venue consumers read only published effective terms through get_effective_terms().
-- Admins read/mutate legal records only through MFA/RBAC-gated admin RPCs.

drop policy if exists terms_authenticated_read on public.terms_versions;

revoke all on table public.terms_versions from anon, authenticated;

-- Keep the deliberately narrow RPC access model explicit.
revoke all on function public.get_effective_terms(text) from public;
grant execute on function public.get_effective_terms(text) to anon, authenticated;

revoke all on function public.admin_get_legal_documents() from public, anon;
revoke all on function public.admin_get_legal_document(uuid) from public, anon;
revoke all on function public.admin_update_legal_draft(uuid,text,text,jsonb,text) from public, anon;
revoke all on function public.admin_submit_legal_document_for_review(uuid,text) from public, anon;
revoke all on function public.admin_record_legal_review(uuid,jsonb,text) from public, anon;
revoke all on function public.admin_return_legal_document_to_draft(uuid,text) from public, anon;
revoke all on function public.admin_approve_legal_document(uuid,text) from public, anon;

grant execute on function public.admin_get_legal_documents() to authenticated;
grant execute on function public.admin_get_legal_document(uuid) to authenticated;
grant execute on function public.admin_update_legal_draft(uuid,text,text,jsonb,text) to authenticated;
grant execute on function public.admin_submit_legal_document_for_review(uuid,text) to authenticated;
grant execute on function public.admin_record_legal_review(uuid,jsonb,text) to authenticated;
grant execute on function public.admin_return_legal_document_to_draft(uuid,text) to authenticated;
grant execute on function public.admin_approve_legal_document(uuid,text) to authenticated;

-- SwiftTip MVP v3 — Operations support-case detail projection.

create or replace function public.admin_get_support_case_detail(p_case_id uuid)
returns table (
  case_id uuid,
  case_reference text,
  requester_type text,
  category text,
  subject text,
  description text,
  severity text,
  case_status text,
  worker_id uuid,
  worker_display_name text,
  venue_id uuid,
  venue_name text,
  tip_id uuid,
  tip_reference text,
  assigned_admin_user_id uuid,
  created_at timestamptz,
  resolved_at timestamptz,
  closed_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, private
as $$
begin
  perform private.require_admin_role(array['operations_admin','super_admin']);
  return query
  select s.id,s.case_reference,s.requester_type,s.category,s.subject,s.description,s.severity,s.case_status,
         s.worker_id,w.display_first_name,s.venue_id,v.trading_name,s.tip_id,t.swifttip_reference,
         s.assigned_admin_user_id,s.created_at,s.resolved_at,s.closed_at
  from public.support_cases s
  left join public.workers w on w.id=s.worker_id
  left join public.venues v on v.id=s.venue_id
  left join public.tips t on t.id=s.tip_id
  where s.id=p_case_id;
end;
$$;

revoke all on function public.admin_get_support_case_detail(uuid) from public, anon;
grant execute on function public.admin_get_support_case_detail(uuid) to authenticated;

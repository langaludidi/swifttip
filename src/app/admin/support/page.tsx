import Link from "next/link";
import { requireAdminRole } from "@/lib/access";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";

type Case = {
  case_id: string;
  case_reference: string;
  requester_type: string;
  category: string;
  subject: string;
  severity: string;
  case_status: string;
  worker_id: string | null;
  venue_id: string | null;
  tip_id: string | null;
  assigned_admin_user_id: string | null;
  created_at: string;
};

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en-ZA", { timeZone:"Africa/Johannesburg", dateStyle:"medium", timeStyle:"short" }).format(new Date(value));
}

export default async function AdminSupportPage() {
  const access = await requireAdminRole(["operations_admin","super_admin"]);
  let cases: Case[] = access.mode === "demo" ? [{case_id:"00000000-0000-0000-0000-000000000001",case_reference:"ST-SUP-26-000001",requester_type:"worker",category:"verification",subject:"Verification status question",severity:"normal",case_status:"open",worker_id:null,venue_id:null,tip_id:null,assigned_admin_user_id:null,created_at:new Date().toISOString()}] : [];
  if (access.mode === "live") {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.rpc("admin_get_support_cases", { p_limit:100 });
    cases = (data ?? []) as Case[];
  }

  return <main className="dashboard-shell"><header className="dashboard-topbar"><div><span className="eyebrow">Operations</span><h1>Support cases</h1><p className="lead">Triage service issues without changing the underlying financial record.</p></div><Link className="action-link" href="/admin">Overview</Link></header>{access.mode === "demo" && <p className="prototype-warning">Preview data only — the live support queue is already implemented.</p>}<section className="dashboard-section">{cases.length ? cases.map(item => <Link className="queue-row" href={`/admin/support/${item.case_id}`} key={item.case_id}><div><strong>{item.case_reference} · {item.subject}</strong><div className="meta">{item.requester_type} · {item.category} · {dateLabel(item.created_at)}</div></div><div style={{textAlign:"right"}}><span className={item.severity === "critical" || item.severity === "high" ? "status-chip warning" : "status-chip"}>{item.severity}</span><div className="meta" style={{marginTop:5}}>{item.case_status.replaceAll("_"," ")}</div></div></Link>) : <div className="empty-state"><strong>No open support work</strong><p>New Worker and operational cases will appear here with permanent references.</p></div>}</section><section className="trust-card"><span className="trust-icon">✓</span><div><strong>Support is a workflow, not an override</strong><p>Closing a support case cannot mark a payment successful, settle funds or erase a financial exception.</p></div></section></main>;
}

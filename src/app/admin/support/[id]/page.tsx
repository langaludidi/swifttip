import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminRole } from "@/lib/access";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { updateSupportCase } from "../actions";

type Detail = {
  case_id:string; case_reference:string; requester_type:string; category:string; subject:string; description:string;
  severity:string; case_status:string; worker_id:string|null; worker_display_name:string|null; venue_id:string|null;
  venue_name:string|null; tip_id:string|null; tip_reference:string|null; assigned_admin_user_id:string|null;
  created_at:string; resolved_at:string|null; closed_at:string|null;
};

export default async function AdminSupportDetailPage({ params, searchParams }: { params:Promise<{id:string}>; searchParams:Promise<{error?:string;updated?:string}> }) {
  const access = await requireAdminRole(["operations_admin","super_admin"]);
  const { id } = await params;
  const query = await searchParams;
  let item: Detail | null = access.mode === "demo" ? {case_id:id,case_reference:"ST-SUP-26-000001",requester_type:"worker",category:"verification",subject:"Verification status question",description:"I submitted my identity evidence and would like to confirm whether anything else is required.",severity:"normal",case_status:"open",worker_id:null,worker_display_name:"Nomsa",venue_id:null,venue_name:"Example Service Station",tip_id:null,tip_reference:null,assigned_admin_user_id:null,created_at:new Date().toISOString(),resolved_at:null,closed_at:null} : null;
  if (access.mode === "live") {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.rpc("admin_get_support_case_detail", { p_case_id:id });
    item = ((data ?? []) as Detail[])[0] ?? null;
  }
  if (!item) notFound();

  return <main className="dashboard-shell"><header className="dashboard-topbar"><div><span className="eyebrow">{item.case_reference}</span><h1>{item.subject}</h1><p className="lead">{item.category} · {item.requester_type}</p></div><Link className="action-link" href="/admin/support">Support queue</Link></header>{access.mode === "demo" && <p className="prototype-warning">Preview data only — status actions are disabled until live Admin access is connected.</p>}{query.error && <p className="prototype-warning" role="alert">{query.error}</p>}{query.updated && <p className="status-chip success" style={{display:"inline-flex",marginTop:16}}>Case updated</p>}<div className="admin-grid"><section className="dashboard-section"><h2>Issue</h2><p className="lead" style={{whiteSpace:"pre-wrap"}}>{item.description}</p><div className="list-row"><strong>Worker</strong><span>{item.worker_display_name ?? "—"}</span></div><div className="list-row"><strong>Venue</strong><span>{item.venue_name ?? "—"}</span></div><div className="list-row"><strong>Transaction</strong><span>{item.tip_reference ?? "Not linked"}</span></div><div className="list-row"><strong>Severity</strong><span className="status-chip">{item.severity}</span></div></section><section className="dashboard-section"><h2>Case status</h2><div className="list-row"><strong>Current</strong><span className="status-chip warning">{item.case_status.replaceAll("_"," ")}</span></div>{access.mode === "live" && <form action={updateSupportCase} className="stack-actions" style={{marginTop:18}}><input type="hidden" name="caseId" value={item.case_id}/><label className="field-label" htmlFor="status">New status</label><select id="status" name="status" defaultValue={item.case_status}><option value="open">Open</option><option value="in_progress">In progress</option><option value="awaiting_worker">Awaiting Worker</option><option value="awaiting_customer">Awaiting customer</option><option value="awaiting_provider">Awaiting provider</option><option value="resolved">Resolved</option><option value="closed">Closed</option></select><label className="field-label" htmlFor="reason">Operational note</label><textarea id="reason" name="reason" rows={4} maxLength={1000}/><button className="button button-primary" type="submit">Update case</button></form>}</section></div><section className="trust-card"><span className="trust-icon">✓</span><div><strong>Case status is deliberately separate from money status</strong><p>If this issue requires a refund, dispute action or settlement correction, Operations must use the relevant financial workflow rather than resolving it here.</p></div></section></main>;
}

import Link from "next/link";
import { requireAdminRole } from "@/lib/access";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";

type AuditEvent = {
  audit_id:string;
  actor_type:string;
  actor_user_id:string|null;
  actor_role:string|null;
  action:string;
  entity_type:string;
  entity_id:string|null;
  reason:string|null;
  created_at:string;
};

function dateLabel(value:string){return new Intl.DateTimeFormat("en-ZA",{timeZone:"Africa/Johannesburg",dateStyle:"medium",timeStyle:"medium"}).format(new Date(value));}

export default async function AdminAuditPage({ searchParams }:{searchParams:Promise<{entity?:string}>}){
  const access=await requireAdminRole(["security_admin","super_admin"]);
  const {entity}=await searchParams;
  let events:AuditEvent[]=access.mode==="demo"?[{audit_id:"demo",actor_type:"admin",actor_user_id:null,actor_role:"operations_admin",action:"support_case_status_changed",entity_type:"support_case",entity_id:null,reason:"Example audit event",created_at:new Date().toISOString()}]:[];
  if(access.mode==="live"){
    const supabase=await createSupabaseServerClient();
    const {data}=await supabase.rpc("admin_get_audit_events",{p_limit:100,p_entity_type:entity?.trim()||null});
    events=(data??[]) as AuditEvent[];
  }
  return <main className="dashboard-shell"><header className="dashboard-topbar"><div><span className="eyebrow">Security</span><h1>Audit trail</h1><p className="lead">Append-oriented visibility into controlled SwiftTip actions. This is not an editable activity log.</p></div><Link className="action-link" href="/admin">Overview</Link></header>{access.mode==="demo"&&<p className="prototype-warning">Preview data only — live audit events remain restricted to Security Admin and Super Admin roles with MFA.</p>}<section className="dashboard-section"><form method="get" className="stack-actions"><label className="field-label" htmlFor="entity">Filter by entity type</label><div className="custom-field"><input id="entity" name="entity" defaultValue={entity??""} placeholder="e.g. support_case"/></div><button className="button button-secondary" type="submit">Apply filter</button></form></section><section className="dashboard-section">{events.length?events.map(event=><div className="queue-row" key={event.audit_id}><div><strong>{event.action.replaceAll("_"," ")}</strong><div className="meta">{event.entity_type}{event.actor_role?` · ${event.actor_role.replaceAll("_"," ")}`:""}{event.reason?` · ${event.reason}`:""}</div></div><div className="meta" style={{textAlign:"right"}}>{dateLabel(event.created_at)}</div></div>):<div className="empty-state"><strong>No matching audit events</strong><p>Controlled actions will appear here as the pilot begins operating.</p></div>}</section><section className="trust-card"><span className="trust-icon">✓</span><div><strong>Audit visibility is narrow by design</strong><p>Venue users, Workers and ordinary Operations users cannot browse the institutional audit trail.</p></div></section></main>;
}

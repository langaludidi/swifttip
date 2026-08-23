import Link from "next/link";
import { requireAdminRole } from "@/lib/access";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";

type LegalDoc={terms_version_id:string;terms_type:string;version_code:string;title:string|null;review_status:string;blocker_count:number;published_at:string|null;effective_from:string;submitted_for_review_at:string|null;reviewed_at:string|null;approved_at:string|null;updated_at:string};

const labels:Record<string,string>={worker_terms:"Worker Terms",venue_terms:"Venue Terms",customer_transaction_terms:"Customer Transaction Terms",privacy_notice:"Privacy Notice"};
function statusClass(v:string){return v==="approved"?"status-chip success":"status-chip warning";}

export default async function LegalRegisterPage(){
  const access=await requireAdminRole(["operations_admin","super_admin"]);
  let docs:LegalDoc[]=[];
  if(access.mode==="live"){
    const supabase=await createSupabaseServerClient();
    const result=await supabase.rpc("admin_get_legal_documents");
    docs=(result.data??[]) as LegalDoc[];
  }
  return <main className="dashboard-shell">
    <header className="dashboard-topbar"><div><span className="eyebrow">Legal control</span><h1>Legal document register</h1><p className="lead">Draft, review and approval are separate from publication. This workspace intentionally has no publish control.</p></div><Link className="action-link" href="/admin/readiness">Readiness</Link></header>
    {access.mode==="demo"&&<p className="prototype-warning">Preview mode. The live legal register is available only with the MVP v3 database connection.</p>}
    <section className="trust-card"><span className="trust-icon">✓</span><div><strong>Publication is structurally absent</strong><p>A document can be drafted, reviewed and approved here, but it cannot become operative from this screen. Published terms require a later explicit controlled action.</p></div></section>
    <section className="dashboard-section"><div className="section-heading"><h2>Draft set</h2><span className="meta">{docs.length} versions</span></div>{docs.length?docs.map(doc=><Link className="queue-row" href={`/admin/legal/${encodeURIComponent(doc.terms_version_id)}`} key={doc.terms_version_id}><div><strong>{labels[doc.terms_type]??doc.terms_type}</strong><div className="meta">{doc.title??doc.version_code}</div><div className="meta">{doc.blocker_count} blocker{doc.blocker_count===1?"":"s"} · updated {new Date(doc.updated_at).toLocaleDateString("en-ZA")}</div></div><div style={{textAlign:"right"}}><span className={statusClass(doc.review_status)}>{doc.review_status.replaceAll("_"," ")}</span><div className="meta" style={{marginTop:6}}>{doc.published_at?"Published":"Unpublished"}</div></div></Link>):<div className="empty-state"><strong>No legal versions</strong><p>Draft legal documents will appear here.</p></div>}</section>
  </main>;
}

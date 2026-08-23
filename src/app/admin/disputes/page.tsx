import Link from "next/link";
import { requireAdminRole } from "@/lib/access";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { formatZar } from "@/lib/money";

type Dispute={dispute_id:string;swifttip_reference:string;worker_display_name:string;venue_name:string;disputed_amount_cents:number;dispute_status:string;dispute_reason:string|null;provider_dispute_ref:string;opened_at:string;evidence_due_at:string|null;resolved_at:string|null;financial_outcome_cents:number|null};

export default async function DisputeQueuePage(){
  const access=await requireAdminRole(["operations_admin","finance_admin","super_admin"]);
  let rows:Dispute[]=[];
  if(access.mode==="live"){
    const supabase=await createSupabaseServerClient();
    const {data}=await supabase.rpc("admin_get_dispute_queue",{p_limit:50});
    rows=(data??[]) as Dispute[];
  }
  return <main className="dashboard-shell"><header className="dashboard-topbar"><div><span className="eyebrow">Financial operations</span><h1>Dispute queue</h1><p className="lead">Chargebacks are tracked independently from Refunds and Settlements because a Worker may already have settled before a dispute arrives.</p></div><Link className="action-link" href="/admin">Overview</Link></header>
  {access.mode==="demo"&&<p className="prototype-warning">Preview mode. Provider dispute actions remain disabled.</p>}
  <section className="dashboard-section"><div className="section-heading"><h2>Disputes</h2><span className="meta">{rows.length}</span></div>{rows.length?rows.map(d=><Link className="queue-row" href={`/admin/disputes/${encodeURIComponent(d.dispute_id)}`} key={d.dispute_id}><div><strong>{d.swifttip_reference}</strong><div className="meta">{d.worker_display_name} · {d.venue_name}{d.evidence_due_at?` · evidence due ${new Date(d.evidence_due_at).toLocaleDateString("en-ZA")}`:""}</div></div><div style={{textAlign:"right"}}><strong>{formatZar(Number(d.disputed_amount_cents))}</strong><div className="meta">{d.dispute_status.replaceAll("_"," ")}</div></div></Link>):<div className="empty-state"><strong>No Disputes</strong><p>Provider dispute events will populate this queue once live payments exist.</p></div>}</section>
  <section className="trust-card"><span className="trust-icon">i</span><div><strong>No hidden Worker clawback</strong><p>The system records the dispute and Settlement truth separately. It does not create a negative Worker wallet or silently deduct future gratuities.</p></div></section></main>;
}

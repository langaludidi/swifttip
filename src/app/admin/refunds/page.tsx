import Link from "next/link";
import { requireAdminRole } from "@/lib/access";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { formatZar } from "@/lib/money";

type Refund={refund_id:string;swifttip_reference:string;worker_display_name:string;venue_name:string;requested_amount_cents:number;approved_amount_cents:number|null;refund_status:string;refund_reason:string;requested_at:string;reviewed_at:string|null;completed_at:string|null;provider_refund_ref:string|null};

export default async function RefundQueuePage(){
  const access=await requireAdminRole(["operations_admin","finance_admin","super_admin"]);
  let rows:Refund[]=[];
  if(access.mode==="live"){
    const supabase=await createSupabaseServerClient();
    const {data}=await supabase.rpc("admin_get_refund_queue",{p_limit:50});
    rows=(data??[]) as Refund[];
  }
  return <main className="dashboard-shell"><header className="dashboard-topbar"><div><span className="eyebrow">Financial operations</span><h1>Refund queue</h1><p className="lead">Read-only until the approved provider and Refund policy define how money is actually reversed.</p></div><Link className="action-link" href="/admin">Overview</Link></header>
  {access.mode==="demo"&&<p className="prototype-warning">Preview mode. No Refund can be initiated from this screen.</p>}
  <section className="dashboard-section"><div className="section-heading"><h2>Refund records</h2><span className="meta">{rows.length}</span></div>{rows.length?rows.map(r=><Link className="queue-row" href={`/admin/refunds/${encodeURIComponent(r.refund_id)}`} key={r.refund_id}><div><strong>{r.swifttip_reference}</strong><div className="meta">{r.worker_display_name} · {r.venue_name} · {r.refund_reason}</div></div><div style={{textAlign:"right"}}><strong>{formatZar(Number(r.requested_amount_cents))}</strong><div className="meta">{r.refund_status.replaceAll("_"," ")}</div></div></Link>):<div className="empty-state"><strong>No Refund records</strong><p>Refunds will appear only when an authorised process creates them.</p></div>}</section>
  <section className="trust-card"><span className="trust-icon">i</span><div><strong>No premature refund mechanics</strong><p>This build does not assume whether processor fees, SwiftTip fees or already-settled Worker funds are reversible. Those rules remain a provider/legal decision.</p></div></section></main>;
}

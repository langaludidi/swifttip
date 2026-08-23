import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminRole } from "@/lib/access";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { formatZar } from "@/lib/money";

type DisputeDetail={dispute_id:string;tip_id:string;payment_attempt_id:string;swifttip_reference:string;worker_display_name:string;venue_name:string;gross_gratuity_cents:number;customer_total_cents:number;worker_net_cents:number;disputed_amount_cents:number;dispute_status:string;dispute_reason:string|null;provider_code:string;provider_dispute_ref:string;opened_at:string;evidence_due_at:string|null;evidence_submitted_at:string|null;resolved_at:string|null;financial_outcome_cents:number|null;worker_settlement_state:string|null;worker_settlement_completed_at:string|null};

export default async function DisputeDetailPage({params}:{params:Promise<{disputeId:string}>}){
  const access=await requireAdminRole(["operations_admin","finance_admin","super_admin"]);
  const {disputeId}=await params;
  let d:DisputeDetail|null=null;
  if(access.mode==="live"){
    const supabase=await createSupabaseServerClient();
    const {data}=await supabase.rpc("admin_get_dispute_detail",{p_dispute_id:disputeId});
    d=((data??[]) as DisputeDetail[])[0]??null;
  }
  if(access.mode==="demo") d={dispute_id:disputeId,tip_id:"demo",payment_attempt_id:"demo",swifttip_reference:"ST-26-DEMO02",worker_display_name:"Thando",venue_name:"Example Service Station",gross_gratuity_cents:5000,customer_total_cents:5250,worker_net_cents:4750,disputed_amount_cents:5250,dispute_status:"evidence_required",dispute_reason:"Cardholder dispute",provider_code:"unconfigured",provider_dispute_ref:"DEMO-DSP",opened_at:new Date().toISOString(),evidence_due_at:null,evidence_submitted_at:null,resolved_at:null,financial_outcome_cents:null,worker_settlement_state:"succeeded",worker_settlement_completed_at:new Date().toISOString()};
  if(!d)notFound();
  const settled=d.worker_settlement_state==="succeeded";
  return <main className="dashboard-shell"><header className="dashboard-topbar"><div><span className="eyebrow">Dispute trace</span><h1>{d.swifttip_reference}</h1><p className="lead">{d.worker_display_name} · {d.venue_name}</p></div><Link className="action-link" href="/admin/disputes">Dispute queue</Link></header>
  {access.mode==="demo"&&<p className="prototype-warning">Preview only — no provider evidence or response can be submitted here.</p>}
  <div className="admin-grid"><section className="dashboard-section"><h2>Financial truth</h2><div className="money-breakdown"><div className="money-row"><span>Gross gratuity</span><strong>{formatZar(Number(d.gross_gratuity_cents))}</strong></div><div className="money-row"><span>Customer paid</span><strong>{formatZar(Number(d.customer_total_cents))}</strong></div><div className="money-row"><span>Worker net entitlement</span><strong>{formatZar(Number(d.worker_net_cents))}</strong></div><div className="money-row total"><span>Disputed amount</span><strong>{formatZar(Number(d.disputed_amount_cents))}</strong></div></div></section>
  <section className="dashboard-section"><h2>Dispute state</h2><div className="list-row"><strong>Status</strong><span className="status-chip warning">{d.dispute_status.replaceAll("_"," ")}</span></div><div className="list-row"><strong>Provider</strong><span>{d.provider_code}</span></div><div className="list-row"><strong>Provider dispute ref</strong><span>{d.provider_dispute_ref}</span></div><div className="list-row"><strong>Evidence due</strong><span>{d.evidence_due_at?new Date(d.evidence_due_at).toLocaleString("en-ZA"):"Not supplied"}</span></div><p className="fee-note">{d.dispute_reason??"No provider reason recorded."}</p></section></div>
  <section className={settled?"prototype-warning":"trust-card"}><strong>{settled?"Worker funds were already settled":"Worker Settlement not recorded as succeeded"}</strong><p>{settled?`Settlement completed ${d.worker_settlement_completed_at?new Date(d.worker_settlement_completed_at).toLocaleString("en-ZA"):"before/around this dispute"}. SwiftTip must not invent an automatic clawback rule.`:"Provider liability and Settlement state remain separate records."}</p></section>
  <section className="trust-card"><span className="trust-icon">!</span><div><strong>Chargeback policy gate</strong><p>No automatic recovery, Worker debit or future-Tip deduction is implemented. Post-Settlement chargeback responsibility must be resolved with the selected provider and legal/commercial policy first.</p></div></section></main>;
}

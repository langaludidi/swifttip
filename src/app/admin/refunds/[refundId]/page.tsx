import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminRole } from "@/lib/access";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { formatZar } from "@/lib/money";

type RefundDetail={refund_id:string;tip_id:string;payment_attempt_id:string;swifttip_reference:string;worker_display_name:string;venue_name:string;gross_gratuity_cents:number;customer_fee_cents:number;customer_total_cents:number;worker_fee_cents:number;worker_net_cents:number;requested_amount_cents:number;approved_amount_cents:number|null;refund_status:string;refund_reason:string;provider_refund_ref:string|null;requested_at:string;reviewed_at:string|null;submitted_at:string|null;completed_at:string|null};

export default async function RefundDetailPage({params}:{params:Promise<{refundId:string}>}){
  const access=await requireAdminRole(["operations_admin","finance_admin","super_admin"]);
  const {refundId}=await params;
  let r:RefundDetail|null=null;
  if(access.mode==="live"){
    const supabase=await createSupabaseServerClient();
    const {data}=await supabase.rpc("admin_get_refund_detail",{p_refund_id:refundId});
    r=((data??[]) as RefundDetail[])[0]??null;
  }
  if(access.mode==="demo") r={refund_id:refundId,tip_id:"demo",payment_attempt_id:"demo",swifttip_reference:"ST-26-DEMO01",worker_display_name:"Thando",venue_name:"Example Service Station",gross_gratuity_cents:5000,customer_fee_cents:250,customer_total_cents:5250,worker_fee_cents:250,worker_net_cents:4750,requested_amount_cents:5250,approved_amount_cents:null,refund_status:"requested",refund_reason:"Customer reported duplicate charge",provider_refund_ref:null,requested_at:new Date().toISOString(),reviewed_at:null,submitted_at:null,completed_at:null};
  if(!r)notFound();
  return <main className="dashboard-shell"><header className="dashboard-topbar"><div><span className="eyebrow">Refund trace</span><h1>{r.swifttip_reference}</h1><p className="lead">{r.worker_display_name} · {r.venue_name}</p></div><Link className="action-link" href="/admin/refunds">Refund queue</Link></header>
  {access.mode==="demo"&&<p className="prototype-warning">Preview only — no Refund mutation is available.</p>}
  <div className="admin-grid"><section className="dashboard-section"><h2>Original Tip economics</h2><div className="money-breakdown"><div className="money-row"><span>Gross gratuity</span><strong>{formatZar(Number(r.gross_gratuity_cents))}</strong></div><div className="money-row"><span>Customer service fee</span><strong>{formatZar(Number(r.customer_fee_cents))}</strong></div><div className="money-row total"><span>Customer paid</span><strong>{formatZar(Number(r.customer_total_cents))}</strong></div><div className="money-row"><span>Worker success fee</span><strong>{formatZar(Number(r.worker_fee_cents))}</strong></div><div className="money-row"><span>Worker net entitlement</span><strong>{formatZar(Number(r.worker_net_cents))}</strong></div></div></section>
  <section className="dashboard-section"><h2>Refund record</h2><div className="list-row"><strong>Status</strong><span className="status-chip warning">{r.refund_status.replaceAll("_"," ")}</span></div><div className="list-row"><strong>Requested amount</strong><span>{formatZar(Number(r.requested_amount_cents))}</span></div><div className="list-row"><strong>Approved amount</strong><span>{r.approved_amount_cents==null?"Not approved yet":formatZar(Number(r.approved_amount_cents))}</span></div><div className="list-row"><strong>Provider reference</strong><span>{r.provider_refund_ref??"Not submitted"}</span></div><p className="fee-note">Reason: {r.refund_reason}</p></section></div>
  <section className="trust-card"><span className="trust-icon">!</span><div><strong>Financial action intentionally absent</strong><p>Approve/submit controls will be added only after Refund fee treatment, Settlement impact, provider API behaviour and authorisation roles are formally resolved.</p></div></section></main>;
}

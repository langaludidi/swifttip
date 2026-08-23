import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { getServerConfig } from "@/lib/config";
import { formatZar } from "@/lib/money";

type Receipt={swifttip_reference:string;worker_display_name:string;worker_role:string;venue_name:string;gross_gratuity_cents:number;customer_fee_cents:number;customer_total_cents:number;currency:string;tip_status:string;payment_state:string;created_at:string;completed_at:string|null};

function heading(r:Receipt){
  if(r.tip_status==="completed")return {eyebrow:"Tip received",title:`Your tip to ${r.worker_display_name} has been received.`,tone:"success"};
  if(["failed","cancelled"].includes(r.payment_state)||r.tip_status==="cancelled")return {eyebrow:"Payment not completed",title:"This tip was not completed.",tone:"warning"};
  if(r.tip_status==="expired")return {eyebrow:"Session expired",title:"This tip session has expired.",tone:"warning"};
  if(["processing","pending","authorised"].includes(r.payment_state)||r.tip_status==="payment_in_progress")return {eyebrow:"Payment processing",title:"We are still confirming the payment.",tone:"warning"};
  return {eyebrow:"Tip session",title:"Payment has not been completed yet.",tone:"warning"};
}

export default async function ReceiptPage({params}:{params:Promise<{token:string}>}){
  const {token}=await params;
  const config=getServerConfig();
  if(!config.databaseConfigured)notFound();
  if(!/^[0-9a-fA-F-]{36}$/.test(token))notFound();
  const supabase=await createSupabaseServerClient();
  const {data}=await supabase.rpc("get_public_tip_receipt",{p_receipt_token:token});
  const receipt=((data??[]) as Receipt[])[0]??null;
  if(!receipt)notFound();
  const copy=heading(receipt);
  return <main className="flow-shell"><div className="flow-page"><header className="simple-header"><Link className="back-link" href="/">←</Link><strong>SwiftTip receipt</strong><span style={{width:42}}/></header><section className="tip-flow"><span className="eyebrow">{copy.eyebrow}</span><h1>{copy.title}</h1><p className="lead">This receipt records the customer-facing payment state. It does not claim that the Worker has already settled funds to their bank account.</p>
  <section className="worker-card" style={{marginTop:22}}><div className="worker-photo">{receipt.worker_display_name.slice(0,1).toUpperCase()}</div><div className="worker-meta"><strong>{receipt.worker_display_name}</strong><span>{receipt.worker_role}</span><span>{receipt.venue_name}</span></div><span className={copy.tone==="success"?"status-chip success":"status-chip warning"}>{receipt.tip_status.replaceAll("_"," ")}</span></section>
  <div className="money-breakdown"><div className="money-row"><span>Gratuity</span><strong>{formatZar(Number(receipt.gross_gratuity_cents))}</strong></div><div className="money-row"><span>SwiftTip service fee</span><strong>{formatZar(Number(receipt.customer_fee_cents))}</strong></div><div className="money-row total"><span>Total</span><strong>{formatZar(Number(receipt.customer_total_cents))}</strong></div></div>
  <div className="dashboard-section"><div className="list-row"><strong>SwiftTip reference</strong><span>{receipt.swifttip_reference}</span></div><div className="list-row"><strong>Payment state</strong><span>{receipt.payment_state.replaceAll("_"," ")}</span></div><div className="list-row"><strong>Created</strong><span>{new Date(receipt.created_at).toLocaleString("en-ZA")}</span></div>{receipt.completed_at&&<div className="list-row"><strong>Payment confirmed</strong><span>{new Date(receipt.completed_at).toLocaleString("en-ZA")}</span></div>}</div>
  <p className="fee-note">No customer account was created for this receipt. Keep this private receipt link if you need to refer to the transaction later.</p></section></div></main>;
}

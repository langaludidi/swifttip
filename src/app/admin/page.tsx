import Link from "next/link";
import { AppMark } from "@/components/AppMark";
import { formatZar } from "@/lib/money";
import { requireAdminSurface } from "@/lib/access";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";

type Dashboard={settlement_exceptions:number;reconciliation_exceptions:number;pending_verifications:number;refund_requests:number;open_disputes:number;successful_tips_7d:number;gross_gratuity_7d_cents:number;swifttip_gross_revenue_7d_cents:number;provider_cost_7d_cents:number;contribution_7d_cents:number};
type Transaction={swifttip_reference:string;completed_at:string|null;worker_display_name:string;venue_name:string;customer_total_cents:number;gross_gratuity_cents:number;worker_net_cents:number;swifttip_gross_revenue_cents:number;provider_cost_cents:number;contribution_cents:number;settlement_state:string};
const demoDashboard:Dashboard={settlement_exceptions:2,reconciliation_exceptions:1,pending_verifications:7,refund_requests:2,open_disputes:1,successful_tips_7d:286,gross_gratuity_7d_cents:894000,swifttip_gross_revenue_7d_cents:44700,provider_cost_7d_cents:21800,contribution_7d_cents:22900};
const demoTransactions:Transaction[]=[{swifttip_reference:"ST-26-8F3K9D",completed_at:new Date().toISOString(),worker_display_name:"Thando",venue_name:"Example Service Station",customer_total_cents:5250,gross_gratuity_cents:5000,worker_net_cents:4750,swifttip_gross_revenue_cents:500,provider_cost_cents:290,contribution_cents:210,settlement_state:"pending"}];

function ControlTile({href,icon,title,meta}:{href:string;icon:string;title:string;meta:string}){
  return <Link className="control-tile" href={href}><span className="control-icon">{icon}</span><div><strong>{title}</strong><span>{meta}</span></div><span className="control-arrow">→</span></Link>;
}

export default async function AdminPage(){
  const access=await requireAdminSurface();
  let dashboard=demoDashboard;
  let transactions=demoTransactions;
  const financialRole=["operations_admin","finance_admin","super_admin"].includes(access.role);
  const operationsRole=["operations_admin","super_admin"].includes(access.role);
  const supportRole=["operations_admin","super_admin"].includes(access.role);
  const verificationRole=["operations_admin","verification_admin","super_admin"].includes(access.role);
  const auditRole=["security_admin","super_admin"].includes(access.role);

  if(access.mode==="live"){
    const supabase=await createSupabaseServerClient();
    const dashboardResult=(await supabase.rpc("admin_get_dashboard")) as unknown as {data:Dashboard[]|null;error:unknown};
    if(dashboardResult.data?.[0])dashboard=dashboardResult.data[0];
    if(financialRole){const txResult=await supabase.rpc("admin_get_recent_transactions",{p_limit:5});transactions=(txResult.data??[]) as Transaction[];}else transactions=[];
  }

  const totalAttention=Number(dashboard.settlement_exceptions)+Number(dashboard.reconciliation_exceptions)+Number(dashboard.pending_verifications)+Number(dashboard.open_disputes)+Number(dashboard.refund_requests);

  return <main className="dashboard-shell admin-shell-polished">
    <header className="dashboard-topbar"><div className="brand-lockup"><AppMark size={42}/><div><strong>SwiftTip</strong><span className="brand-subline">Operations console</span></div></div><span className={access.mode==="demo"?"status-chip warning":"status-chip success"}>{access.mode==="demo"?"Preview data":access.role.replaceAll("_"," ")}</span></header>

    <div className="admin-hero"><section className="dashboard-title"><span className="eyebrow">Operations</span><h1>{totalAttention ? `${totalAttention} items need attention.` : "No urgent exceptions."}</h1><p className="lead">Resolve exceptions and verification work first. Commercial metrics stay visible without competing with operational risk.</p></section></div>

    <div className="admin-attention-grid">
      <article className={Number(dashboard.settlement_exceptions)>0?"attention-card danger":"attention-card"}><span>Settlement exceptions</span><strong>{Number(dashboard.settlement_exceptions)}</strong><small>Money movement evidence</small></article>
      <article className={Number(dashboard.reconciliation_exceptions)>0?"attention-card danger":"attention-card"}><span>Reconciliation exceptions</span><strong>{Number(dashboard.reconciliation_exceptions)}</strong><small>Records do not reconcile</small></article>
      <article className={Number(dashboard.pending_verifications)>0?"attention-card warning":"attention-card"}><span>Worker verification</span><strong>{Number(dashboard.pending_verifications)}</strong><small>Awaiting review</small></article>
      <article className={Number(dashboard.open_disputes)>0?"attention-card warning":"attention-card"}><span>Open disputes</span><strong>{Number(dashboard.open_disputes)}</strong><small>Evidence or response needed</small></article>
    </div>

    <div className="admin-grid">
      {financialRole&&<section className="dashboard-section commercial-pulse-card"><div className="section-heading"><div><span className="eyebrow">Commercial pulse</span><h2>Last 7 days</h2></div><Link className="action-link" href="/admin/pilot">Pilot scorecard</Link></div><div className="money-breakdown"><div className="money-row"><span>Successful tips</span><strong>{Number(dashboard.successful_tips_7d)}</strong></div><div className="money-row"><span>Gross gratuity value</span><strong>{formatZar(Number(dashboard.gross_gratuity_7d_cents))}</strong></div><div className="money-row"><span>SwiftTip gross fee revenue</span><strong>{formatZar(Number(dashboard.swifttip_gross_revenue_7d_cents))}</strong></div><div className="money-row"><span>Recorded provider direct cost</span><strong>− {formatZar(Number(dashboard.provider_cost_7d_cents))}</strong></div><div className="money-row total"><span>Transaction contribution</span><strong>{formatZar(Number(dashboard.contribution_7d_cents))}</strong></div></div><p className="fee-note">Contribution is not profit. It is gross SwiftTip transaction revenue less recorded direct provider costs.</p></section>}

      <section className="dashboard-section"><div className="section-heading"><div><span className="eyebrow">Control centre</span><h2>Go where the work is</h2></div></div><div className="control-grid">
        {verificationRole&&<ControlTile href="/admin/verifications" icon="✓" title="Worker verification" meta={`${Number(dashboard.pending_verifications)} awaiting attention`}/>} 
        {operationsRole&&<ControlTile href="/admin/venues" icon="⌂" title="Venue register" meta="Create and approve participating locations"/>}
        {supportRole&&<ControlTile href="/admin/support" icon="?" title="Support cases" meta="Operational triage and case status"/>}
        {financialRole&&<ControlTile href="/admin/settlements" icon="S" title="Settlement exceptions" meta={`${Number(dashboard.settlement_exceptions)} requiring review`}/>} 
        {financialRole&&<ControlTile href="/admin/transactions" icon="R" title="Transactions" meta="Canonical financial traceability"/>}
        {financialRole&&<ControlTile href="/admin/refunds" icon="↺" title="Refunds" meta={`${Number(dashboard.refund_requests)} requiring or awaiting processing`}/>} 
        {financialRole&&<ControlTile href="/admin/disputes" icon="!" title="Disputes" meta={`${Number(dashboard.open_disputes)} open or evidence-stage cases`}/>} 
        {operationsRole&&<ControlTile href="/admin/legal" icon="§" title="Legal register" meta="Draft and review; publication is separate"/>}
        {financialRole&&<ControlTile href="/admin/readiness" icon="G" title="Commercial readiness" meta="Pricing, legal and activation gates"/>}
        {operationsRole&&<ControlTile href="/admin/pilot/setup" icon="P" title="Pilot setup" meta="Draft cohorts and Venue assignment only"/>}
        {auditRole&&<ControlTile href="/admin/audit" icon="A" title="Audit trail" meta="Restricted security visibility"/>}
      </div></section>
    </div>

    {financialRole&&<section className="dashboard-section"><div className="section-heading"><div><span className="eyebrow">Financial trace</span><h2>Recent successful transactions</h2></div><Link className="action-link" href="/admin/transactions">View all</Link></div>{transactions.length?transactions.map(tx=><Link className="queue-row" href={`/admin/transactions/${encodeURIComponent(tx.swifttip_reference)}`} key={tx.swifttip_reference}><div><strong>{tx.swifttip_reference}</strong><div className="meta">{tx.worker_display_name} · {tx.venue_name} · Gratuity {formatZar(Number(tx.gross_gratuity_cents))}</div></div><div style={{textAlign:"right"}}><strong>{formatZar(Number(tx.contribution_cents))}</strong><div className="meta">contribution</div></div></Link>):<div className="empty-state-polished"><span className="empty-icon">R</span><strong>No successful transactions yet</strong><p>Completed Tips will appear here only after live money is enabled and canonical payment evidence is recorded.</p></div>}</section>}
  </main>;
}

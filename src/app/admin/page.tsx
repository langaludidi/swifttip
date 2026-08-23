import Link from "next/link";
import { AppMark } from "@/components/AppMark";
import { formatZar } from "@/lib/money";
import { requireAdminSurface } from "@/lib/access";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";

type Dashboard={settlement_exceptions:number;reconciliation_exceptions:number;pending_verifications:number;refund_requests:number;open_disputes:number;successful_tips_7d:number;gross_gratuity_7d_cents:number;swifttip_gross_revenue_7d_cents:number;provider_cost_7d_cents:number;contribution_7d_cents:number};
type Transaction={swifttip_reference:string;completed_at:string|null;worker_display_name:string;venue_name:string;customer_total_cents:number;gross_gratuity_cents:number;worker_net_cents:number;swifttip_gross_revenue_cents:number;provider_cost_cents:number;contribution_cents:number;settlement_state:string};
const demoDashboard:Dashboard={settlement_exceptions:2,reconciliation_exceptions:1,pending_verifications:7,refund_requests:2,open_disputes:1,successful_tips_7d:286,gross_gratuity_7d_cents:894000,swifttip_gross_revenue_7d_cents:44700,provider_cost_7d_cents:21800,contribution_7d_cents:22900};
const demoTransactions:Transaction[]=[{swifttip_reference:"ST-26-8F3K9D",completed_at:new Date().toISOString(),worker_display_name:"Thando",venue_name:"Example Service Station",customer_total_cents:5250,gross_gratuity_cents:5000,worker_net_cents:4750,swifttip_gross_revenue_cents:500,provider_cost_cents:290,contribution_cents:210,settlement_state:"pending"}];

export default async function AdminPage(){
  const access=await requireAdminSurface();
  let dashboard=demoDashboard;
  let transactions=demoTransactions;
  const financialRole=["operations_admin","finance_admin","super_admin"].includes(access.role);
  const supportRole=["operations_admin","super_admin"].includes(access.role);
  const verificationRole=["operations_admin","verification_admin","super_admin"].includes(access.role);
  const auditRole=["security_admin","super_admin"].includes(access.role);

  if(access.mode==="live"){
    const supabase=await createSupabaseServerClient();
    const dashboardResult=(await supabase.rpc("admin_get_dashboard")) as unknown as {data:Dashboard[]|null;error:unknown};
    if(dashboardResult.data?.[0])dashboard=dashboardResult.data[0];
    if(financialRole){const txResult=await supabase.rpc("admin_get_recent_transactions",{p_limit:5});transactions=(txResult.data??[]) as Transaction[];}else transactions=[];
  }

  return <main className="dashboard-shell">
    <header className="dashboard-topbar"><div className="brand-lockup"><AppMark size={42}/><strong>SwiftTip Operations</strong></div><span className="status-chip warning">{access.mode==="demo"?"Preview data":access.role.replaceAll("_"," ")}</span></header>
    <section className="dashboard-title"><span className="eyebrow">Operations</span><h1>Attention first.</h1><p className="lead">Exceptions, verification and readiness controls take priority over vanity metrics.</p></section>
    <div className="metric-grid" style={{marginTop:22}}><article className="metric-card"><span>Settlement exceptions</span><strong>{Number(dashboard.settlement_exceptions)}</strong><small>Needs review</small></article><article className="metric-card"><span>Reconciliation exceptions</span><strong>{Number(dashboard.reconciliation_exceptions)}</strong><small>Needs review</small></article><article className="metric-card"><span>Pending verification</span><strong>{Number(dashboard.pending_verifications)}</strong></article><article className="metric-card"><span>Open disputes</span><strong>{Number(dashboard.open_disputes)}</strong></article></div>

    <div className="admin-grid"><section className="dashboard-section"><h2>7-day commercial pulse</h2><div className="money-breakdown"><div className="money-row"><span>Successful tips</span><strong>{Number(dashboard.successful_tips_7d)}</strong></div><div className="money-row"><span>Gross gratuity value</span><strong>{formatZar(Number(dashboard.gross_gratuity_7d_cents))}</strong></div><div className="money-row"><span>SwiftTip gross fee revenue</span><strong>{formatZar(Number(dashboard.swifttip_gross_revenue_7d_cents))}</strong></div><div className="money-row"><span>Provider direct cost</span><strong>− {formatZar(Number(dashboard.provider_cost_7d_cents))}</strong></div><div className="money-row total"><span>Transaction contribution</span><strong>{formatZar(Number(dashboard.contribution_7d_cents))}</strong></div></div><p className="fee-note">Contribution is not profit. It is gross transaction revenue less recorded direct provider costs.</p></section>
      <section className="dashboard-section"><h2>Control surfaces</h2>{verificationRole&&<Link className="queue-row" href="/admin/verifications"><div><strong>Worker verification</strong><div className="meta">{Number(dashboard.pending_verifications)} requiring attention</div></div><span>→</span></Link>}{financialRole&&<><Link className="queue-row" href="/admin/settlements"><div><strong>Settlement exceptions</strong><div className="meta">{Number(dashboard.settlement_exceptions)} requiring attention</div></div><span>→</span></Link><Link className="queue-row" href="/admin/transactions"><div><strong>Transactions</strong><div className="meta">Financial traceability</div></div><span>→</span></Link><Link className="queue-row" href="/admin/readiness"><div><strong>Commercial readiness</strong><div className="meta">Pricing, terms and activation gates</div></div><span>→</span></Link></>}{supportRole&&<Link className="queue-row" href="/admin/support"><div><strong>Support cases</strong><div className="meta">Controlled operational triage</div></div><span>→</span></Link>}{auditRole&&<Link className="queue-row" href="/admin/audit"><div><strong>Audit trail</strong><div className="meta">Restricted security visibility</div></div><span>→</span></Link>}</section></div>

    {financialRole&&<section className="dashboard-section"><div className="section-heading"><h2>Recent transactions</h2><Link className="action-link" href="/admin/transactions">View all</Link></div>{transactions.length?transactions.map(tx=><Link className="queue-row" href={`/admin/transactions/${encodeURIComponent(tx.swifttip_reference)}`} key={tx.swifttip_reference}><div><strong>{tx.swifttip_reference}</strong><div className="meta">{tx.worker_display_name} · {tx.venue_name} · Tip {formatZar(Number(tx.gross_gratuity_cents))}</div></div><div style={{textAlign:"right"}}><strong>{formatZar(Number(tx.contribution_cents))}</strong><div className="meta">contribution</div></div></Link>):<div className="empty-state"><strong>No successful transactions yet</strong><p>Completed Tips will appear here once live money is enabled.</p></div>}</section>}
  </main>;
}

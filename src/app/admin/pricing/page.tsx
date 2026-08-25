import Link from "next/link";
import { requireAdminRole } from "@/lib/access";
import { formatZar } from "@/lib/money";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";

type Pricing={pricing_id:string;version_code:string;pricing_status:string;review_status:string;blocker_count:number;effective_from:string|null;worker_fee_bps:number;customer_fixed_fee_cents:number;customer_fee_bps:number;customer_fee_cap_cents:number|null;minimum_gratuity_cents:number;maximum_gratuity_cents:number;high_value_threshold_cents:number;updated_at:string};

function statusClass(value:string){return value==="approved"||value==="active"?"status-chip success":"status-chip warning";}

export default async function PricingRegisterPage(){
  const access=await requireAdminRole(["operations_admin","finance_admin","super_admin"]);
  let pricing:Pricing[]=[];
  if(access.mode==="live"){
    const supabase=await createSupabaseServerClient();
    const result=await supabase.rpc("admin_get_pricing_versions");
    pricing=(result.data??[]) as Pricing[];
  }else{
    pricing=[{pricing_id:"demo",version_code:"v3-working-001",pricing_status:"draft",review_status:"draft",blocker_count:8,effective_from:null,worker_fee_bps:500,customer_fixed_fee_cents:100,customer_fee_bps:300,customer_fee_cap_cents:500,minimum_gratuity_cents:500,maximum_gratuity_cents:50000,high_value_threshold_cents:20000,updated_at:new Date().toISOString()}];
  }
  return <main className="dashboard-shell">
    <header className="dashboard-topbar"><div><span className="eyebrow">Commercial control</span><h1>Pricing governance</h1><p className="lead">Working figures move through draft, formal review and approval. This workspace deliberately has no scheduling or activation control.</p></div><Link className="action-link" href="/admin/readiness">Readiness</Link></header>
    {access.mode==="demo"&&<p className="prototype-warning">Preview mode. Pricing changes are disabled without the canonical database connection.</p>}
    <section className="trust-card"><span className="trust-icon">✓</span><div><strong>Approval cannot activate charging</strong><p>Approved pricing remains inactive until a separate future controlled release sets an effective date and activation status. The payment and public-intake switches stay off.</p></div></section>
    <section className="dashboard-section"><div className="section-heading"><h2>Pricing versions</h2><span className="meta">{pricing.length} versions</span></div>{pricing.length?pricing.map(p=><Link className="queue-row" href={`/admin/pricing/${encodeURIComponent(p.pricing_id)}`} key={p.pricing_id}><div><strong>{p.version_code}</strong><div className="meta">Worker {Number(p.worker_fee_bps)/100}% · Customer {formatZar(Number(p.customer_fixed_fee_cents))} + {Number(p.customer_fee_bps)/100}%{p.customer_fee_cap_cents==null?"":` capped at ${formatZar(Number(p.customer_fee_cap_cents))}`}</div><div className="meta">{Number(p.blocker_count)} blocker{Number(p.blocker_count)===1?"":"s"} · updated {new Date(p.updated_at).toLocaleDateString("en-ZA")}</div></div><div style={{textAlign:"right"}}><span className={statusClass(p.review_status)}>{p.review_status.replaceAll("_"," ")}</span><div className="meta" style={{marginTop:6}}>{p.pricing_status} · {p.effective_from?"effective date set":"no effective date"}</div></div></Link>):<div className="empty-state"><strong>No pricing versions</strong><p>Charging cannot start without a controlled pricing version.</p></div>}</section>
  </main>;
}

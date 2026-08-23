import Link from "next/link";
import { AppMark } from "@/components/AppMark";
import { WorkerBottomNav } from "@/components/WorkerBottomNav";
import { requireWorkerSurface } from "@/lib/access";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";

type Context = { display_name:string; worker_status:string; onboarding_status:string; worker_role:string|null; association_status:string|null; venue_name:string|null; venue_location:string|null; public_token:string|null; short_code:string|null; endpoint_status:string|null; settlement_readiness:string|null; masked_destination:string|null };
type State = { identity_verification_status:string; venue_association_status:string; settlement_readiness:string; worker_terms_version_code:string|null; worker_terms_published:boolean; worker_terms_accepted:boolean; activation_ready:boolean };

const demoContext:Context={display_name:"Thando",worker_status:"active",onboarding_status:"ready",worker_role:"Fuel Attendant",association_status:"verified",venue_name:"Example Service Station",venue_location:"Midrand",public_token:"T4K8P",short_code:"T4K8P",endpoint_status:"active",settlement_readiness:"ready",masked_destination:"•••• 4821"};
const demoState:State={identity_verification_status:"approved",venue_association_status:"verified",settlement_readiness:"ready",worker_terms_version_code:"preview",worker_terms_published:true,worker_terms_accepted:true,activation_ready:true};

function label(value:string|null|undefined){return (value??"not ready").replaceAll("_"," ").replace(/^./,c=>c.toUpperCase());}
function chip(done:boolean){return done?"status-chip success":"status-chip warning";}

export default async function WorkerProfilePage() {
  const access=await requireWorkerSurface();
  let context=demoContext;
  let state=demoState;
  if(access.mode==="live"){
    const supabase=await createSupabaseServerClient();
    const [contextResult,stateResult]=await Promise.all([(supabase.rpc as any)("get_worker_context"),(supabase.rpc as any)("get_worker_onboarding_state")]);
    context=((contextResult.data??[]) as Context[])[0]??context;
    state=((stateResult.data??[]) as State[])[0]??state;
  }
  const identityDone=state.identity_verification_status==="approved";
  const venueDone=state.venue_association_status==="verified";
  const settlementDone=state.settlement_readiness==="ready";
  const termsDone=state.worker_terms_published&&state.worker_terms_accepted;
  const endpointActive=context.endpoint_status==="active";

  return <main className="mobile-app-shell"><div className="app-page worker-home-page">
    <header className="topbar"><div className="brand-lockup"><AppMark size={38}/><div><strong>SwiftTip</strong><span className="brand-subline">Worker profile</span></div></div><Link className="compact-link" href="/worker">Home</Link></header>
    {access.mode==="demo"&&<div className="state-banner warning"><span className="state-icon">i</span><div className="state-copy"><strong>Preview profile</strong><p>These values are examples; the live profile is wired to the MVP v3 database projections.</p></div></div>}

    <section className="association-profile"><span className="association-avatar">{context.display_name.slice(0,2).toUpperCase()}</span><div><span className="eyebrow">Worker profile</span><h1>{context.display_name}</h1><p>{context.worker_role??"Worker"}{context.venue_name?` · ${context.venue_name}`:""}</p></div></section>

    <section className="dashboard-section"><div className="section-heading"><div><span className="eyebrow">Customer-facing profile</span><h2>What customers see</h2></div><span className={chip(endpointActive)}>{endpointActive?"Live":"Not active"}</span></div><div className="list-row"><div><strong>{context.display_name}</strong><div className="meta">{context.worker_role??"Worker"}{context.venue_name?` · ${context.venue_name}`:""}{context.venue_location?` · ${context.venue_location}`:""}</div></div></div>{context.public_token&&endpointActive?<div className="stack-actions"><Link className="button button-secondary" href={`/tip/${encodeURIComponent(context.public_token)}`}>Preview customer view</Link><Link className="button button-primary" href="/worker/qr">Show my QR</Link></div>:<div className="state-banner warning"><span className="state-icon">!</span><div className="state-copy"><strong>Tipping profile not active</strong><p>Finish the outstanding activation checks before customers can use your QR.</p></div></div>}</section>

    <section className="dashboard-section"><div className="section-heading"><div><span className="eyebrow">Activation</span><h2>Your readiness</h2></div><Link className="action-link" href="/worker/onboarding">Full checklist</Link></div><div className={identityDone?"activation-row done":"activation-row"}><span className="activation-index">{identityDone?"✓":"1"}</span><div className="activation-copy"><strong>Identity verification</strong><span>SwiftTip identity evidence review</span></div><span className={chip(identityDone)}>{label(state.identity_verification_status)}</span></div><div className={venueDone?"activation-row done":"activation-row"}><span className="activation-index">{venueDone?"✓":"2"}</span><div className="activation-copy"><strong>Venue confirmation</strong><span>Current workplace relationship</span></div><span className={chip(venueDone)}>{label(state.venue_association_status)}</span></div><div className={settlementDone?"activation-row done":"activation-row"}><span className="activation-index">{settlementDone?"✓":"3"}</span><div className="activation-copy"><strong>Settlement readiness</strong><span>Payment-provider destination readiness</span></div><span className={chip(settlementDone)}>{label(state.settlement_readiness)}</span></div><div className={termsDone?"activation-row done":"activation-row"}><span className="activation-index">{termsDone?"✓":"4"}</span><div className="activation-copy"><strong>Worker terms</strong><span>{state.worker_terms_version_code?`Version ${state.worker_terms_version_code}`:"No published version"}</span></div><span className={chip(termsDone)}>{!state.worker_terms_published?"Waiting":state.worker_terms_accepted?"Accepted":"Review"}</span></div></section>

    <section className="dashboard-section"><div className="section-heading"><div><span className="eyebrow">Settlement</span><h2>Your destination</h2></div><span className={chip(settlementDone)}>{label(context.settlement_readiness)}</span></div><div className="list-row"><div><strong>Provider settlement profile</strong><div className="meta">{context.masked_destination??"No verified destination yet"}</div></div></div><div className="privacy-inline"><span>✓</span><p>SwiftTip shows only masked provider information. There is no internal Worker wallet, balance or cash-out control.</p></div></section>

    <section className="dashboard-section"><span className="eyebrow">Account</span><h2>Help and settings</h2><Link className="queue-row" href="/worker/support"><div><strong>Support</strong><div className="meta">Open and track an auditable support case</div></div><span>→</span></Link><Link className="queue-row" href="/worker/onboarding"><div><strong>Activation checklist</strong><div className="meta">See what is complete and what remains</div></div><span>→</span></Link><Link className="queue-row" href="/worker/verification"><div><strong>Identity verification</strong><div className="meta">Review your verification status</div></div><span>→</span></Link></section>

    <div className="nav-clearance"/>
  </div><WorkerBottomNav active="profile"/></main>;
}

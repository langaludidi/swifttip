import Link from "next/link";
import { AppMark } from "@/components/AppMark";
import { BottomNav } from "@/components/BottomNav";
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

  return <main className="mobile-app-shell"><div className="app-page">
    <header className="topbar"><div className="brand-lockup"><AppMark size={38}/><strong>SwiftTip</strong></div><Link className="action-link" href="/worker">Home</Link></header>
    {access.mode==="demo"&&<p className="prototype-warning">Preview data only — live profile fields are already wired to the MVP v3 projections.</p>}
    <section className="dashboard-title"><span className="eyebrow">Worker profile</span><h1>{context.display_name}</h1><p className="lead">{context.worker_role??"Worker"}{context.venue_name?` · ${context.venue_name}`:""}</p></section>

    <section className="dashboard-section"><div className="section-heading"><h2>Public tipping profile</h2><span className={chip(context.endpoint_status==="active")}>{label(context.endpoint_status)}</span></div><div className="list-row"><div><strong>Customer display</strong><div className="meta">{context.display_name}{context.worker_role?` · ${context.worker_role}`:""}{context.venue_name?` · ${context.venue_name}`:""}</div></div></div>{context.public_token&&context.endpoint_status==="active"?<Link className="action-link" href={`/tip/${encodeURIComponent(context.public_token)}`}>Preview customer view</Link>:<p className="fee-note">Your tipping endpoint appears only after activation controls pass.</p>}</section>

    <section className="dashboard-section"><div className="section-heading"><h2>Activation controls</h2><Link className="action-link" href="/worker/onboarding">View checklist</Link></div><div className="list-row"><strong>Identity verification</strong><span className={chip(identityDone)}>{label(state.identity_verification_status)}</span></div><div className="list-row"><strong>Venue confirmation</strong><span className={chip(venueDone)}>{label(state.venue_association_status)}</span></div><div className="list-row"><strong>Settlement readiness</strong><span className={chip(settlementDone)}>{label(state.settlement_readiness)}</span></div><div className="list-row"><strong>Commercial terms</strong><span className={chip(termsDone)}>{!state.worker_terms_published?"Not published":state.worker_terms_accepted?"Accepted":"Review required"}</span></div>{!identityDone&&<Link className="button button-secondary" href="/worker/verification">Continue verification</Link>}</section>

    <section className="dashboard-section"><h2>Settlement destination</h2><div className="list-row"><div><strong>Provider settlement profile</strong><div className="meta">{context.masked_destination??"No verified destination yet"}</div></div><span className={chip(settlementDone)}>{label(context.settlement_readiness)}</span></div><p className="fee-note">SwiftTip shows only masked provider information. There is no internal Worker balance or cash-out control.</p></section>

    <section className="dashboard-section"><h2>Help and account</h2><Link className="queue-row" href="/worker/support"><div><strong>Support</strong><div className="meta">Open and track an auditable support case</div></div><span>→</span></Link><Link className="queue-row" href="/worker/onboarding"><div><strong>Activation checklist</strong><div className="meta">See what is complete and what remains</div></div><span>→</span></Link><Link className="queue-row" href="/worker/verification"><div><strong>Identity verification</strong><div className="meta">Review your verification status</div></div><span>→</span></Link></section>

    <section className="trust-card"><span className="trust-icon">✓</span><div><strong>Worker status: {label(context.worker_status)}</strong><p>Activation readiness is calculated from independent database controls rather than from a screen toggle.</p></div></section>
    <div className="nav-clearance"/>
  </div><BottomNav active="profile"/></main>;
}

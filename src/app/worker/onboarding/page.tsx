import Link from "next/link";
import { redirect } from "next/navigation";
import { AppMark } from "@/components/AppMark";
import { getServerConfig } from "@/lib/config";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { acceptWorkerTerms, activateWorkerAccount, requestVenueAssociation, startWorkerProfile } from "./actions";

type OnboardingState = {
  worker_id: string;
  worker_status: string;
  onboarding_status: string;
  identity_verification_status: string;
  venue_association_id: string | null;
  venue_association_status: string;
  venue_name: string | null;
  settlement_readiness: string;
  worker_terms_version_id: string | null;
  worker_terms_version_code: string | null;
  worker_terms_published: boolean;
  worker_terms_accepted: boolean;
  activation_ready: boolean;
  blocking_reasons: string[];
};

type Venue = {
  venue_id: string;
  trading_name: string;
  branch_name: string | null;
  venue_type: string;
  public_location_label: string | null;
  city: string | null;
  province: string | null;
};

const demoState: OnboardingState = {
  worker_id: "demo",
  worker_status: "draft",
  onboarding_status: "verification_pending",
  identity_verification_status: "submitted",
  venue_association_id: "demo-association",
  venue_association_status: "pending",
  venue_name: "Example Service Station",
  settlement_readiness: "not_ready",
  worker_terms_version_id: null,
  worker_terms_version_code: null,
  worker_terms_published: false,
  worker_terms_accepted: false,
  activation_ready: false,
  blocking_reasons: ["identity_verification", "venue_confirmation", "settlement_readiness", "worker_terms_not_published"]
};

function humanStatus(value: string) {
  return value.replaceAll("_", " ").replace(/^./, char => char.toUpperCase());
}

function gateClass(done: boolean) {
  return done ? "status-chip success" : "status-chip warning";
}

export default async function WorkerOnboardingPage({ searchParams }: { searchParams: Promise<{ q?: string; error?: string; started?: string; venueRequested?: string; termsAccepted?: string }> }) {
  const params = await searchParams;
  const config = getServerConfig();
  const preview = config.demoMode;
  let hasWorkerProfile = preview;
  let state: OnboardingState | null = preview ? demoState : null;
  let venues: Venue[] = [];

  if (!preview) {
    const supabase = await createSupabaseServerClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) redirect("/worker/login");

    const { data: worker } = await supabase.from("workers").select("id").eq("user_id", auth.user.id).maybeSingle();
    hasWorkerProfile = Boolean(worker);

    if (worker) {
      const stateResult = await supabase.rpc("get_worker_onboarding_state");
      state = ((stateResult.data ?? []) as OnboardingState[])[0] ?? null;
      if (state && !["verified", "pending"].includes(state.venue_association_status)) {
        const venueResult = await supabase.rpc("list_worker_available_venues", { p_search: params.q?.trim() || null, p_limit: 20 });
        venues = (venueResult.data ?? []) as Venue[];
      }
    }
  }

  if (!hasWorkerProfile) {
    return <main className="flow-shell customer-flow-page"><div className="flow-page"><header className="simple-header"><Link className="back-link" href="/worker/login">←</Link><strong>Set up your profile</strong><span style={{width:42}}/></header><section className="tip-flow"><span className="eyebrow">Step 1 of 5</span><h1>Start with the name customers should recognise.</h1><p className="lead">Your legal name stays private. Customers see only your chosen first name, role and verified Venue.</p>{params.error && <div className="state-banner error" role="alert"><span className="state-icon">!</span><div className="state-copy"><strong>We could not save that</strong><p>{params.error}</p></div></div>}<form action={startWorkerProfile} className="stack-actions" style={{marginTop:24}}><label className="field-label" htmlFor="legalFirstName">Legal first name</label><div className="custom-field"><input id="legalFirstName" name="legalFirstName" autoComplete="given-name" required/></div><label className="field-label" htmlFor="legalLastName">Legal surname</label><div className="custom-field"><input id="legalLastName" name="legalLastName" autoComplete="family-name" required/></div><label className="field-label" htmlFor="displayFirstName">First name customers should see</label><div className="custom-field"><input id="displayFirstName" name="displayFirstName" required/></div><button className="button button-primary button-large" type="submit">Continue</button></form><div className="privacy-inline"><span>✓</span><p>Your legal name is used for verification and is not shown on the public tipping profile.</p></div></section></div></main>;
  }

  if (!state) redirect("/unavailable");

  const identityDone = state.identity_verification_status === "approved";
  const venueDone = state.venue_association_status === "verified";
  const settlementDone = state.settlement_readiness === "ready";
  const termsDone = state.worker_terms_published && state.worker_terms_accepted;
  const gates = [true, identityDone, venueDone, settlementDone, termsDone];
  const completeCount = gates.filter(Boolean).length;

  return <main className="mobile-app-shell"><div className="app-page worker-home-page">
    <header className="topbar"><div className="brand-lockup"><AppMark size={38}/><div><strong>SwiftTip</strong><span className="brand-subline">Worker setup</span></div></div><Link className="compact-link" href="/worker">Exit</Link></header>
    {preview && <div className="state-banner warning"><span className="state-icon">i</span><div className="state-copy"><strong>Preview activation flow</strong><p>The database gates are implemented, but this deployment is not yet connected to the live staging database.</p></div></div>}
    {params.error && <div className="state-banner error" role="alert"><span className="state-icon">!</span><div className="state-copy"><strong>Action not completed</strong><p>{params.error}</p></div></div>}
    {(params.started || params.venueRequested || params.termsAccepted) && <div className="state-banner success"><span className="state-icon">✓</span><div className="state-copy"><strong>Saved</strong><p>Your activation progress has been updated.</p></div></div>}

    <section className="dashboard-title onboarding-title"><span className="eyebrow">Worker activation</span><h1>{state.activation_ready ? "You're ready to activate." : `${completeCount} of 5 checks complete.`}</h1><p className="lead">Finish each check once. SwiftTip will not open your tipping endpoint until all required controls pass.</p></section>
    <div className="onboarding-progress" aria-label={`${completeCount} of 5 activation checks complete`}>{gates.map((done,index)=><span key={index} className={done ? "done" : index===completeCount ? "current" : ""}/>)}</div>

    <section className="dashboard-section activation-card">
      <div className="activation-row done"><span className="activation-index">✓</span><div className="activation-copy"><strong>Worker profile</strong><span>Your private identity and customer display name</span></div><span className="status-chip success">Complete</span></div>
      <div className={identityDone ? "activation-row done" : "activation-row"}><span className="activation-index">{identityDone ? "✓" : "2"}</span><div className="activation-copy"><strong>Identity verification</strong><span>SwiftTip identity evidence review</span></div><span className={gateClass(identityDone)}>{humanStatus(state.identity_verification_status)}</span></div>
      <div className={venueDone ? "activation-row done" : "activation-row"}><span className="activation-index">{venueDone ? "✓" : "3"}</span><div className="activation-copy"><strong>Venue confirmation</strong><span>{state.venue_name ?? "Choose where you currently work"}</span></div><span className={gateClass(venueDone)}>{humanStatus(state.venue_association_status)}</span></div>
      <div className={settlementDone ? "activation-row done" : "activation-row"}><span className="activation-index">{settlementDone ? "✓" : "4"}</span><div className="activation-copy"><strong>Settlement readiness</strong><span>Completed with the approved payment provider</span></div><span className={gateClass(settlementDone)}>{humanStatus(state.settlement_readiness)}</span></div>
      <div className={termsDone ? "activation-row done" : "activation-row"}><span className="activation-index">{termsDone ? "✓" : "5"}</span><div className="activation-copy"><strong>Worker terms</strong><span>{state.worker_terms_version_code ? `Version ${state.worker_terms_version_code}` : "No Worker terms published yet"}</span></div><span className={gateClass(termsDone)}>{!state.worker_terms_published ? "Waiting" : state.worker_terms_accepted ? "Accepted" : "Review"}</span></div>
    </section>

    {!identityDone && <section className="activation-action-card primary-next"><span className="eyebrow">Next action</span><h2>Verify your identity</h2><p className="lead">Upload only the evidence SwiftTip needs to confirm who you are. Payment-provider KYC remains separate.</p><Link className="button button-primary" href="/worker/verification">Continue identity verification</Link></section>}

    {identityDone && !venueDone && state.venue_association_status === "pending" && <section className="activation-action-card primary-next"><span className="eyebrow">Venue confirmation</span><h2>Waiting for {state.venue_name ?? "your Venue"}</h2><p className="lead">A Venue Admin must independently confirm that you currently work there. There is nothing else you need to submit for this step.</p><span className="status-chip warning" style={{marginTop:13}}>Confirmation pending</span></section>}

    {identityDone && !venueDone && state.venue_association_status !== "pending" && <section className="activation-action-card primary-next"><span className="eyebrow">Next action</span><h2>Choose your current Venue</h2><p className="lead">Your request does not activate the relationship. The Venue must confirm it separately.</p><form method="get" className="stack-actions" style={{marginTop:16}}><label className="field-label" htmlFor="q">Search participating Venues</label><div className="custom-field"><input id="q" name="q" defaultValue={params.q ?? ""} placeholder="Venue name or town"/></div><button className="button button-secondary" type="submit">Search</button></form>{venues.length ? <div style={{marginTop:16}}>{venues.map(venue => <form action={requestVenueAssociation} className="queue-row" key={venue.venue_id} style={{alignItems:"end"}}><input type="hidden" name="venueId" value={venue.venue_id}/><div style={{flex:1}}><strong>{venue.trading_name}{venue.branch_name ? ` · ${venue.branch_name}` : ""}</strong><div className="meta">{venue.public_location_label ?? [venue.city,venue.province].filter(Boolean).join(", ")} · {humanStatus(venue.venue_type)}</div><label className="field-label" htmlFor={`role-${venue.venue_id}`} style={{marginTop:10}}>Your role</label><input id={`role-${venue.venue_id}`} name="workerRole" placeholder="e.g. Fuel Attendant" required/></div><button className="button button-primary" type="submit">Request</button></form>)}</div> : <div className="empty-state-polished"><span className="empty-icon">⌂</span><strong>No matching Venue yet</strong><p>Try another search, or ask the Venue to join the SwiftTip pilot before requesting confirmation.</p></div>}</section>}

    {identityDone && venueDone && !settlementDone && <section className="activation-action-card blocked-system-card"><span className="eyebrow">Settlement</span><h2>Provider setup is still pending</h2><p className="lead">SwiftTip will not ask you to load money into an internal wallet. Settlement details will be handled through the approved payment provider when configured.</p><span className="status-chip warning">No Worker action yet</span></section>}

    {identityDone && venueDone && settlementDone && !termsDone && <section className="activation-action-card primary-next"><span className="eyebrow">Final Worker check</span><h2>{state.worker_terms_published ? "Review the current Worker terms" : "Worker terms are not published yet"}</h2><p className="lead">Any Worker transaction success fee must be stated clearly in the published terms before activation.</p>{state.worker_terms_published && !state.worker_terms_accepted && <div className="stack-actions"><Link className="button button-secondary" href="/legal/worker-terms" target="_blank">Read version {state.worker_terms_version_code}</Link><form action={acceptWorkerTerms}><button className="button button-primary" type="submit">Accept version {state.worker_terms_version_code}</button></form></div>}</section>}

    {state.activation_ready ? <section className="activation-action-card primary-next"><span className="eyebrow">Ready</span><h2>Open your SwiftTip profile</h2><p className="lead">All activation controls have passed. Activating makes your approved tipping endpoint available to customers.</p><form action={activateWorkerAccount}><button className="button button-primary button-large" type="submit">Activate my SwiftTip profile</button></form></section> : <section className="trust-card"><span className="trust-icon">✓</span><div><strong>Activation cannot be bypassed</strong><p>The database independently checks identity, Venue, Settlement readiness and current Worker terms.</p></div></section>}
    <div className="nav-clearance"/>
  </div></main>;
}

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
    return <main className="flow-shell"><div className="flow-page"><header className="simple-header"><Link className="back-link" href="/worker/login">←</Link><strong>Worker onboarding</strong><span style={{width:42}}/></header><section className="tip-flow"><span className="eyebrow">Your Worker profile</span><h1>Start with the identity customers should recognise.</h1><p className="lead">Your legal name stays private. Customers see only your chosen first name, role and verified Venue.</p>{params.error && <p className="prototype-warning" role="alert">{params.error}</p>}<form action={startWorkerProfile} className="stack-actions" style={{marginTop:24}}><label className="field-label" htmlFor="legalFirstName">Legal first name</label><div className="custom-field"><input id="legalFirstName" name="legalFirstName" autoComplete="given-name" required/></div><label className="field-label" htmlFor="legalLastName">Legal surname</label><div className="custom-field"><input id="legalLastName" name="legalLastName" autoComplete="family-name" required/></div><label className="field-label" htmlFor="displayFirstName">First name customers should see</label><div className="custom-field"><input id="displayFirstName" name="displayFirstName" required/></div><button className="button button-primary button-large" type="submit">Start my Worker profile</button></form></section></div></main>;
  }

  if (!state) redirect("/unavailable");

  const identityDone = state.identity_verification_status === "approved";
  const venueDone = state.venue_association_status === "verified";
  const settlementDone = state.settlement_readiness === "ready";
  const termsDone = state.worker_terms_published && state.worker_terms_accepted;

  return <main className="mobile-app-shell"><div className="app-page">
    <header className="topbar"><div className="brand-lockup"><AppMark size={38}/><strong>SwiftTip</strong></div><Link className="action-link" href="/worker">Worker home</Link></header>
    {preview && <p className="prototype-warning">Preview only — these gates are now enforced in the MVP v3 database, but this deployment is not yet connected to it.</p>}
    {params.error && <p className="prototype-warning" role="alert">{params.error}</p>}
    {(params.started || params.venueRequested || params.termsAccepted) && <p className="status-chip success" style={{display:"inline-flex",marginTop:16}}>Saved successfully</p>}

    <section className="dashboard-title"><span className="eyebrow">Worker activation</span><h1>Complete each check once.</h1><p className="lead">SwiftTip will not activate a tipping endpoint until identity, Venue, settlement and current commercial terms all pass.</p></section>

    <section className="dashboard-section"><div className="section-heading"><h2>Activation checklist</h2><span className={gateClass(state.activation_ready)}>{state.activation_ready ? "Ready" : `${state.blocking_reasons.length} remaining`}</span></div>
      <div className="list-row"><div><strong>1. Worker profile</strong><div className="meta">Your private identity and customer display name</div></div><span className="status-chip success">Complete</span></div>
      <div className="list-row"><div><strong>2. Identity verification</strong><div className="meta">SwiftTip identity evidence review</div></div><span className={gateClass(identityDone)}>{humanStatus(state.identity_verification_status)}</span></div>
      <div className="list-row"><div><strong>3. Venue confirmation</strong><div className="meta">{state.venue_name ?? "Choose where you currently work"}</div></div><span className={gateClass(venueDone)}>{humanStatus(state.venue_association_status)}</span></div>
      <div className="list-row"><div><strong>4. Settlement readiness</strong><div className="meta">Completed with the approved payment provider</div></div><span className={gateClass(settlementDone)}>{humanStatus(state.settlement_readiness)}</span></div>
      <div className="list-row"><div><strong>5. Commercial terms</strong><div className="meta">{state.worker_terms_version_code ? `Version ${state.worker_terms_version_code}` : "No Worker terms published yet"}</div></div><span className={gateClass(termsDone)}>{!state.worker_terms_published ? "Awaiting publication" : state.worker_terms_accepted ? "Accepted" : "Review required"}</span></div>
    </section>

    {!identityDone && <section className="dashboard-section"><span className="eyebrow">Identity</span><h2>Verify who you are</h2><p className="lead">Upload only the evidence SwiftTip needs for identity verification. Payment-provider KYC remains separate.</p><Link className="button button-primary" href="/worker/verification">Continue identity verification</Link></section>}

    {!venueDone && state.venue_association_status === "pending" && <section className="dashboard-section"><span className="eyebrow">Venue confirmation</span><h2>Request sent to {state.venue_name ?? "your Venue"}</h2><p className="lead">A Venue Admin must confirm that you currently work there. SwiftTip cannot approve this on the Worker’s behalf.</p></section>}

    {!venueDone && state.venue_association_status !== "pending" && <section className="dashboard-section"><span className="eyebrow">Venue</span><h2>Where do you currently work?</h2><p className="lead">Only active SwiftTip Venues are shown. Your request creates a pending association; the Venue must confirm it separately.</p><form method="get" className="stack-actions" style={{marginTop:16}}><label className="field-label" htmlFor="q">Search Venues</label><div className="custom-field"><input id="q" name="q" defaultValue={params.q ?? ""} placeholder="Venue name or town"/></div><button className="button button-secondary" type="submit">Search</button></form>{venues.length ? <div style={{marginTop:16}}>{venues.map(venue => <form action={requestVenueAssociation} className="queue-row" key={venue.venue_id} style={{alignItems:"end"}}><input type="hidden" name="venueId" value={venue.venue_id}/><div style={{flex:1}}><strong>{venue.trading_name}{venue.branch_name ? ` · ${venue.branch_name}` : ""}</strong><div className="meta">{venue.public_location_label ?? [venue.city,venue.province].filter(Boolean).join(", ")} · {humanStatus(venue.venue_type)}</div><label className="field-label" htmlFor={`role-${venue.venue_id}`} style={{marginTop:10}}>Your role</label><input id={`role-${venue.venue_id}`} name="workerRole" placeholder="e.g. Fuel Attendant" required/></div><button className="button button-primary" type="submit">Request confirmation</button></form>)}</div> : <div className="empty-state" style={{marginTop:16}}><strong>No available Venues found</strong><p>Try another search, or ask the Venue to join the SwiftTip pilot before requesting confirmation.</p></div>}</section>}

    {!settlementDone && <section className="dashboard-section"><span className="eyebrow">Settlement</span><h2>Payment-provider verification is not ready yet.</h2><p className="lead">SwiftTip does not collect a bank account into an internal wallet. Settlement details will be verified through the approved payment provider once that provider is contracted and configured.</p><span className="status-chip warning">No action required yet</span></section>}

    {!termsDone && <section className="dashboard-section"><span className="eyebrow">Commercial terms</span><h2>{state.worker_terms_published ? "Review the current Worker terms" : "Worker terms are not published yet"}</h2><p className="lead">Workers are free to join and remain on SwiftTip. Any transaction success fee must be stated clearly in the published terms before activation.</p>{state.worker_terms_published && !state.worker_terms_accepted && <form action={acceptWorkerTerms}><button className="button button-primary" type="submit">I accept version {state.worker_terms_version_code}</button></form>}</section>}

    {state.activation_ready ? <section className="trust-card"><span className="trust-icon">✓</span><div style={{flex:1}}><strong>All activation checks passed</strong><p>Your Worker profile can now become active.</p><form action={activateWorkerAccount} style={{marginTop:12}}><button className="button button-primary" type="submit">Activate my SwiftTip profile</button></form></div></section> : <section className="trust-card"><span className="trust-icon">✓</span><div><strong>No shortcut around activation controls</strong><p>The database independently checks all four external gates before activation. The interface cannot override them.</p></div></section>}
    <div className="nav-clearance"/>
  </div></main>;
}

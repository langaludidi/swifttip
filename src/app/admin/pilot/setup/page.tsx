import Link from "next/link";
import { requireAdminRole } from "@/lib/access";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { createDraftPilot, addPilotVenue } from "./actions";

type Pricing={pricing_id:string;version_code:string;pricing_status:string;worker_fee_bps:number;customer_fixed_fee_cents:number;customer_fee_bps:number;customer_fee_cap_cents:number|null};
type Cohort={pilot_cohort_id:string;name:string;cohort_status:string;cohort_type:string|null;pricing_version_id:string;pricing_version_code:string;pricing_status:string;start_at:string|null;end_at:string|null;venue_count:number;created_at:string};
type Venue={venue_id:string;trading_name:string;branch_name:string|null;venue_type:string;public_location_label:string|null;venue_status:string;active_member_count:number;verified_worker_count:number;pending_worker_count:number;created_at:string};

export default async function PilotSetupPage({searchParams}:{searchParams:Promise<{error?:string;created?:string;venue?:string}>}){
  const access=await requireAdminRole(["operations_admin","super_admin"]);
  const params=await searchParams;
  let pricing:Pricing[]=[];let cohorts:Cohort[]=[];let venues:Venue[]=[];
  if(access.mode==="live"){
    const supabase=await createSupabaseServerClient();
    const [pricingResult,cohortResult,venueResult]=await Promise.all([
      supabase.rpc("admin_get_pricing_versions"),
      (supabase.rpc("admin_get_pilot_cohorts") as unknown as Promise<{data:Cohort[]|null;error:unknown}>),
      supabase.rpc("admin_get_venues",{p_status:"active"})
    ]);
    pricing=(pricingResult.data??[]) as Pricing[];
    cohorts=(cohortResult.data??[]) as Cohort[];
    venues=(venueResult.data??[]) as Venue[];
  } else {
    pricing=[{pricing_id:"demo-price",version_code:"v3-working-001",pricing_status:"draft",worker_fee_bps:500,customer_fixed_fee_cents:100,customer_fee_bps:300,customer_fee_cap_cents:500}];
  }
  const draftCohorts=cohorts.filter(c=>c.cohort_status==="draft");
  return <main className="dashboard-shell"><header className="dashboard-topbar"><div><span className="eyebrow">Pilot controls</span><h1>Prepare the pilot without activating it.</h1><p className="lead">Create a draft cohort and assign approved Venues. This surface deliberately has no Start Pilot control.</p></div><Link className="action-link" href="/admin/pilot">Scorecard</Link></header>
  {access.mode==="demo"&&<p className="prototype-warning">Preview only — draft setup becomes operational after the new Supabase connection is attached to Vercel.</p>}
  {params.error&&<p className="prototype-warning" role="alert">{params.error}</p>}{params.created&&<p className="status-chip success" style={{display:"inline-flex"}}>Draft pilot created</p>}{params.venue&&<p className="status-chip success" style={{display:"inline-flex"}}>Venue assigned</p>}
  <div className="admin-grid"><section className="dashboard-section"><h2>Create draft cohort</h2><form action={createDraftPilot} className="stack-actions" style={{marginTop:18}}><label className="field-label" htmlFor="pilot-name">Pilot name</label><div className="custom-field"><input id="pilot-name" name="name" placeholder="SwiftTip P1 — Gauteng" minLength={3} maxLength={160} required/></div><label className="field-label" htmlFor="cohort-type">Cohort type</label><select id="cohort-type" name="cohortType" defaultValue="dual_archetype"><option value="dual_archetype">Dual archetype</option><option value="fuel">Fuel</option><option value="hospitality">Hospitality</option><option value="other">Other</option></select><label className="field-label" htmlFor="pricing-version">Pricing version</label><select id="pricing-version" name="pricingVersionId" required>{pricing.map(p=><option value={p.pricing_id} key={p.pricing_id}>{p.version_code} · {p.pricing_status}</option>)}</select><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><div><label className="field-label" htmlFor="startAt">Planned start</label><input id="startAt" type="date" name="startAt"/></div><div><label className="field-label" htmlFor="endAt">Planned end</label><input id="endAt" type="date" name="endAt"/></div></div><button className="button button-primary" type="submit" disabled={!pricing.length}>Create draft pilot</button></form><p className="fee-note">Draft creation does not activate pricing, payments, Workers, Venues or the pilot.</p></section>
  <section className="dashboard-section"><h2>Assign active Venue</h2>{draftCohorts.length&&venues.length?<form action={addPilotVenue} className="stack-actions" style={{marginTop:18}}><label className="field-label" htmlFor="cohortId">Draft pilot</label><select id="cohortId" name="cohortId" required>{draftCohorts.map(c=><option value={c.pilot_cohort_id} key={c.pilot_cohort_id}>{c.name} · {Number(c.venue_count)} Venues</option>)}</select><label className="field-label" htmlFor="venueId">Approved Venue</label><select id="venueId" name="venueId" required>{venues.map(v=><option value={v.venue_id} key={v.venue_id}>{v.branch_name||v.trading_name}{v.public_location_label?` · ${v.public_location_label}`:""}</option>)}</select><button className="button button-secondary" type="submit">Add Venue to draft</button></form>:<div className="empty-state"><strong>Nothing to assign yet</strong><p>You need at least one draft cohort and one active Venue.</p></div>}</section></div>
  <section className="dashboard-section"><div className="section-heading"><h2>Pilot cohorts</h2><span className="meta">{cohorts.length}</span></div>{cohorts.length?cohorts.map(c=><div className="list-row" key={c.pilot_cohort_id}><div><strong>{c.name}</strong><div className="meta">{c.cohort_type??"Unclassified"} · pricing {c.pricing_version_code} ({c.pricing_status}) · {Number(c.venue_count)} Venues</div></div><span className={c.cohort_status==="draft"?"status-chip warning":"status-chip success"}>{c.cohort_status}</span></div>):<div className="empty-state"><strong>No cohorts yet</strong><p>The first pilot remains unconstituted until you explicitly create a draft.</p></div>}</section>
  <section className="trust-card"><span className="trust-icon">✓</span><div><strong>Activation remains separate</strong><p>There is intentionally no function or UI action here that changes a cohort from draft to active. Go-live remains a later controlled decision.</p></div></section></main>;
}

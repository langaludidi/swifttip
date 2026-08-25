import Link from "next/link";
import { requireAdminRole } from "@/lib/access";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { createVenue, approveVenue, inviteVenueMember } from "./actions";

type Venue = {
  venue_id: string;
  trading_name: string;
  branch_name: string | null;
  venue_type: string;
  public_location_label: string | null;
  venue_status: string;
  active_member_count: number;
  verified_worker_count: number;
  pending_worker_count: number;
  created_at: string;
};

export default async function AdminVenuesPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; created?: string; approved?: string; invited?: string }>;
}) {
  const access = await requireAdminRole(["operations_admin", "super_admin"]);
  const params = await searchParams;
  let rows: Venue[] = [];
  let venueTermsPublished = false;

  if (access.mode === "live") {
    const supabase = await createSupabaseServerClient();
    const [{ data }, readiness] = await Promise.all([
      supabase.rpc("admin_get_venues", {}),
      supabase.rpc("admin_get_commercial_readiness")
    ]);
    rows = (data ?? []) as Venue[];
    venueTermsPublished = Boolean((readiness.data as Array<{ venue_terms_published:boolean }> | null)?.[0]?.venue_terms_published);
  } else {
    venueTermsPublished = true;
  }

  const activeVenues = rows.filter((venue) => venue.venue_status === "active");

  return (
    <main className="dashboard-shell">
      <header className="dashboard-topbar">
        <div>
          <span className="eyebrow">Venue operations</span>
          <h1>Venue register</h1>
          <p className="lead">SwiftTip creates and approves participating Venues. Venue users cannot self-authorise a location.</p>
        </div>
        <Link className="action-link" href="/admin">Overview</Link>
      </header>

      {access.mode === "demo" && <p className="prototype-warning">Preview mode. Venue mutations become available only after the live Supabase connection is attached.</p>}
      {params.error && <p className="prototype-warning" role="alert">{params.error}</p>}
      {params.created && <p className="status-chip success" style={{ display: "inline-flex" }}>Venue created for review</p>}
      {params.approved && <p className="status-chip success" style={{ display: "inline-flex" }}>Venue approved</p>}
      {params.invited && <p className="status-chip success" style={{ display: "inline-flex" }}>Invitation prepared for {params.invited}</p>}
      {!venueTermsPublished && <div className="state-banner warning"><span className="state-icon">!</span><div className="state-copy"><strong>Venue onboarding is blocked</strong><p>No effective Venue Terms version is published. You can prepare the register, but Venue users cannot activate membership yet.</p></div></div>}

      <div className="admin-grid">
        <section className="dashboard-section">
          <span className="eyebrow">Register</span>
          <h2>Add Venue</h2>
          <form action={createVenue} className="stack-actions" style={{ marginTop: 18 }}>
            <label className="field-label" htmlFor="tradingName">Trading name</label>
            <div className="custom-field"><input id="tradingName" name="tradingName" placeholder="Example Service Station" required /></div>
            <label className="field-label" htmlFor="branchName">Branch / site name</label>
            <div className="custom-field"><input id="branchName" name="branchName" placeholder="Midrand" /></div>
            <label className="field-label" htmlFor="venueType">Venue type</label>
            <select id="venueType" name="venueType" defaultValue="fuel_station">
              <option value="fuel_station">Fuel station</option>
              <option value="car_wash">Car wash</option>
              <option value="valet">Valet</option>
              <option value="hotel">Hotel</option>
              <option value="restaurant">Restaurant</option>
              <option value="other">Other</option>
            </select>
            <label className="field-label" htmlFor="city">City</label>
            <div className="custom-field"><input id="city" name="city" /></div>
            <label className="field-label" htmlFor="province">Province</label>
            <div className="custom-field"><input id="province" name="province" placeholder="Gauteng" /></div>
            <label className="field-label" htmlFor="locationLabel">Public location label</label>
            <div className="custom-field"><input id="locationLabel" name="locationLabel" placeholder="Midrand" /></div>
            <button className="button button-primary" type="submit">Create Venue for review</button>
          </form>
        </section>

        <section className="dashboard-section">
          <span className="eyebrow">Access</span>
          <h2>Invite Venue user</h2>
          <p className="lead">The person must first sign in to SwiftTip once with this email. Operations then grants access to a specific active Venue. An invitation never creates or approves a Venue.</p>
          <form action={inviteVenueMember} className="stack-actions" style={{ marginTop: 18 }}>
            <label className="field-label" htmlFor="inviteVenueId">Active Venue</label>
            <select id="inviteVenueId" name="venueId" defaultValue="" required disabled={access.mode !== "live" || activeVenues.length === 0}>
              <option value="" disabled>Select a Venue</option>
              {activeVenues.map((venue) => <option key={venue.venue_id} value={venue.venue_id}>{venue.branch_name || venue.trading_name}</option>)}
            </select>
            <label className="field-label" htmlFor="inviteEmail">Venue user email</label>
            <div className="custom-field"><input id="inviteEmail" name="email" type="email" autoComplete="email" placeholder="manager@example.co.za" required /></div>
            <label className="field-label" htmlFor="inviteRole">Access role</label>
            <select id="inviteRole" name="role" defaultValue="venue_admin">
              <option value="venue_admin">Venue admin — confirm Worker relationships</option>
              <option value="venue_viewer">View only</option>
            </select>
            <button className="button button-primary" type="submit" disabled={access.mode !== "live" || activeVenues.length === 0}>Invite Venue user</button>
          </form>
          {activeVenues.length === 0 && <div className="state-banner warning"><span className="state-icon">!</span><div className="state-copy"><strong>No active Venue yet</strong><p>Approve a Venue before inviting its users.</p></div></div>}
          <div className="privacy-inline"><span>✓</span><p>Access is membership-scoped. Venue users never receive Worker KYC, banking or Settlement authority.</p></div>
        </section>
      </div>

      <section className="dashboard-section venue-boundary-card">
        <span className="eyebrow">Operating boundary</span>
        <h2>Participation does not change the money model</h2>
        <div className="list-row"><strong>Venue pays mandatory subscription</strong><span>No</span></div>
        <div className="list-row"><strong>Venue sees Worker bank/KYC</strong><span>No</span></div>
        <div className="list-row"><strong>Venue controls Worker Settlement</strong><span>No</span></div>
        <div className="list-row"><strong>Venue confirms Worker relationship</strong><span>Yes</span></div>
      </section>

      <section className="dashboard-section">
        <div className="section-heading"><h2>Registered Venues</h2><span className="meta">{rows.length}</span></div>
        {rows.length ? rows.map((venue) => (
          <div className="list-row" key={venue.venue_id}>
            <Link href={`/admin/venues/${venue.venue_id}`} style={{minWidth:0,flex:1}}>
              <strong>{venue.branch_name || venue.trading_name}</strong>
              <div className="meta">{venue.trading_name} · {venue.venue_type.replaceAll("_", " ")}{venue.public_location_label ? ` · ${venue.public_location_label}` : ""} · {Number(venue.active_member_count)} active users · {Number(venue.verified_worker_count)} verified Workers · {Number(venue.pending_worker_count)} pending</div>
            </Link>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className={venue.venue_status === "active" ? "status-chip success" : "status-chip warning"}>{venue.venue_status.replaceAll("_", " ")}</span>
              {["draft", "pending_review", "suspended"].includes(venue.venue_status) && access.mode === "live" && (
                <form action={approveVenue}>
                  <input type="hidden" name="venueId" value={venue.venue_id} />
                  <button className="button button-secondary" type="submit">Approve</button>
                </form>
              )}
              <Link className="compact-link" href={`/admin/venues/${venue.venue_id}`}>Open →</Link>
            </div>
          </div>
        )) : <div className="empty-state"><strong>No Venues yet</strong><p>The register is ready for the first pilot locations.</p></div>}
      </section>
    </main>
  );
}

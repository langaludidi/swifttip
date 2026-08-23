import Link from "next/link";
import { AppMark } from "@/components/AppMark";
import { signOutVenue } from "@/app/auth/actions";
import { requireVenueSurface } from "@/lib/access";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { formatZar } from "@/lib/money";

type VenueWorker = {
  association_id: string;
  display_name: string;
  worker_role: string;
  association_status: string;
  worker_status: string;
};

type VenueSummary = {
  participating_workers: number;
  active_workers: number;
  successful_tip_count: number;
  gross_gratuity_cents: number;
};

const demoWorkers: VenueWorker[] = [
  { association_id: "demo-1", display_name: "Thando", worker_role: "Fuel Attendant", association_status: "verified", worker_status: "active" },
  { association_id: "demo-2", display_name: "Nomsa", worker_role: "Cashier", association_status: "verified", worker_status: "active" },
  { association_id: "demo-3", display_name: "Sipho", worker_role: "Fuel Attendant", association_status: "pending", worker_status: "draft" }
];

function associationLabel(worker: VenueWorker) {
  if (worker.association_status === "verified" && worker.worker_status === "active") return "Active";
  if (worker.association_status === "pending") return "Confirm";
  if (worker.association_status === "suspended" || worker.worker_status === "suspended") return "Suspended";
  return "Inactive";
}

export default async function VenuePage() {
  const access = await requireVenueSurface();
  let venueId: string | null = null;
  let venueName = "Riverside Service Station";
  let venueRole = "venue_admin";
  let workers = demoWorkers;
  let summary: VenueSummary = { participating_workers: 13, active_workers: 12, successful_tip_count: 48, gross_gratuity_cents: 126000 };

  if (access.mode === "live") {
    const supabase = await createSupabaseServerClient();
    const membershipResult = await supabase.from("venue_memberships").select("venue_id, venue_role").eq("membership_status", "active").limit(1).maybeSingle();
    if (membershipResult.data) {
      venueId = membershipResult.data.venue_id;
      venueRole = membershipResult.data.venue_role;
      const venueResult = await supabase.from("venues").select("trading_name, branch_name").eq("id", venueId).maybeSingle();
      if (venueResult.data) venueName = venueResult.data.branch_name ?? venueResult.data.trading_name;

      const now = new Date();
      const weekStart = new Date(now);
      const day = weekStart.getDay();
      weekStart.setDate(weekStart.getDate() - ((day + 6) % 7));
      weekStart.setHours(0, 0, 0, 0);

      const [workersResult, summaryResult] = await Promise.all([
        supabase.rpc("get_venue_workers", { p_venue_id: venueId }),
        supabase.rpc("get_venue_summary", { p_venue_id: venueId, p_from: weekStart.toISOString(), p_to: now.toISOString() })
      ]);
      workers = (workersResult.data ?? []) as VenueWorker[];
      if (summaryResult.data?.[0]) summary = summaryResult.data[0] as VenueSummary;
    }
  }

  const needsConfirmation = workers.filter((worker) => worker.association_status === "pending").length;

  return (
    <main className="dashboard-shell venue-dashboard-shell">
      <header className="dashboard-topbar venue-topbar">
        <div className="brand-lockup"><AppMark size={40}/><div><strong>SwiftTip</strong><span className="brand-subline">Venue</span></div></div>
        <div className="topbar-actions"><Link className="compact-link" href="/">Public view</Link>{access.mode === "live" && <form action={signOutVenue}><button className="compact-link compact-button" type="submit">Sign out</button></form>}</div>
      </header>

      {access.mode === "demo" && <p className="prototype-warning">Preview data only — live Venue access is membership-scoped in the MVP v3 database.</p>}

      <section className="dashboard-title venue-title">
        <span className="eyebrow">{venueName}</span>
        <h1>Keep your worker list accurate.</h1>
        <p className="lead">Confirm who is currently associated with this Venue. SwiftTip handles identity verification and settlement controls separately.</p>
      </section>

      {needsConfirmation > 0 && <section className="venue-action-card"><div><span className="eyebrow">Action required</span><strong>{needsConfirmation} worker {needsConfirmation === 1 ? "request needs" : "requests need"} confirmation</strong><p>Review the relationship before the worker can rely on this Venue for SwiftTip activation.</p></div><Link className="button button-primary" href="#workers">Review workers</Link></section>}

      <div className="metric-grid venue-metrics" style={{ marginTop: 22 }}>
        <article className="metric-card"><span>Active workers</span><strong>{Number(summary.active_workers)}</strong><small>Confirmed at this Venue</small></article>
        <article className="metric-card"><span>Needs confirmation</span><strong>{needsConfirmation}</strong><small>Relationship requests</small></article>
        <article className="metric-card"><span>Tips this week</span><strong>{Number(summary.successful_tip_count)}</strong><small>Aggregate activity only</small></article>
        <article className="metric-card"><span>Gratuity activity</span><strong>{formatZar(Number(summary.gross_gratuity_cents))}</strong><small>Venue aggregate, not a leaderboard</small></article>
      </div>

      <section className="dashboard-section" id="workers"><div className="section-heading"><div><span className="eyebrow">People</span><h2>Workers</h2></div><span className="status-chip success">{venueRole === "venue_admin" ? "Venue admin" : "View only"}</span></div>{workers.length ? workers.map((worker) => <Link className="list-row worker-list-row" href={`/venue/workers/${encodeURIComponent(worker.association_id)}`} key={worker.association_id}><div className="worker-list-identity"><span className="worker-initial">{worker.display_name.charAt(0).toUpperCase()}</span><div><strong>{worker.display_name}</strong><div className="meta">{worker.worker_role}</div></div></div><span className={associationLabel(worker) === "Active" ? "status-chip success" : "status-chip warning"}>{associationLabel(worker)}</span></Link>) : <div className="empty-state"><strong>No participating workers</strong><p>Workers associated with this Venue will appear here.</p></div>}</section>

      <section className="dashboard-section venue-boundary-card"><span className="eyebrow">Privacy boundary</span><h2>Venue visibility stays narrow</h2><p className="lead">No Worker banking details, identity documents, provider KYC, settlement controls, payroll tools, tip pools or individual earnings rankings are shown here.</p></section>
    </main>
  );
}

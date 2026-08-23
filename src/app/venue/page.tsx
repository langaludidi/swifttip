import Link from "next/link";
import { AppMark } from "@/components/AppMark";
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
    <main className="dashboard-shell">
      <header className="dashboard-topbar"><div className="brand-lockup"><AppMark size={42}/><strong>SwiftTip Venue</strong></div><Link className="action-link" href="/">Customer view</Link></header>
      {access.mode === "demo" && <p className="prototype-warning">Preview data only — live Venue access is membership-scoped in the MVP v3 database.</p>}
      <section className="dashboard-title"><span className="eyebrow">{venueName}</span><h1>Venue overview</h1><p className="lead">Lightweight participation: confirm workers, see aggregate activity, and avoid payroll or Settlement administration.</p></section>
      <div className="metric-grid" style={{ marginTop: 22 }}>
        <article className="metric-card"><span>Active workers</span><strong>{Number(summary.active_workers)}</strong></article>
        <article className="metric-card"><span>Tips this week</span><strong>{Number(summary.successful_tip_count)}</strong></article>
        <article className="metric-card"><span>Gross gratuity value</span><strong>{formatZar(Number(summary.gross_gratuity_cents))}</strong></article>
        <article className="metric-card"><span>Needs confirmation</span><strong>{needsConfirmation}</strong></article>
      </div>
      <section className="dashboard-section"><div className="section-heading"><h2>Workers</h2><span className="meta">{venueRole === "venue_admin" ? "Venue admin" : "View only"}</span></div>{workers.length ? workers.map((worker) => <div className="list-row" key={worker.association_id}><div><strong>{worker.display_name}</strong><div className="meta">{worker.worker_role}</div></div><span className={associationLabel(worker) === "Active" ? "status-chip success" : "status-chip warning"}>{associationLabel(worker)}</span></div>) : <div className="empty-state"><strong>No participating workers</strong><p>Workers associated with this Venue will appear here.</p></div>}</section>
      <section className="dashboard-section"><h2>Venue boundary</h2><p className="lead">This interface intentionally excludes Worker banking, KYC documents, Settlement control, payroll, Tip pools and Worker-performance rankings.</p></section>
    </main>
  );
}

import Link from "next/link";
import { AppMark } from "@/components/AppMark";
import { BottomNav } from "@/components/BottomNav";
import { requireWorkerSurface } from "@/lib/access";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { formatZar } from "@/lib/money";

type WorkerContext = {
  display_name: string;
  worker_status: string;
  worker_role: string | null;
  venue_name: string | null;
  public_token: string | null;
  endpoint_status: string | null;
};

type WorkerSummary = {
  successful_tip_count: number;
  gross_gratuity_cents: number;
  worker_fee_cents: number;
  worker_net_cents: number;
  settled_cents: number;
  processing_cents: number;
};

type WorkerTip = {
  swifttip_reference: string;
  gross_gratuity_cents: number;
  completed_at: string | null;
  settlement_state: string;
};

const demoContext: WorkerContext = { display_name: "Thando", worker_status: "active", worker_role: "Fuel Attendant", venue_name: "Riverside Service Station", public_token: "T4K8P", endpoint_status: "active" };
const demoMonth: WorkerSummary = { successful_tip_count: 64, gross_gratuity_cents: 245000, worker_fee_cents: 12250, worker_net_cents: 232750, settled_cents: 213750, processing_cents: 17500 };
const demoToday: WorkerSummary = { successful_tip_count: 5, gross_gratuity_cents: 18000, worker_fee_cents: 900, worker_net_cents: 17100, settled_cents: 12350, processing_cents: 4750 };
const demoTips: WorkerTip[] = [
  { swifttip_reference: "ST-DEMO-001", gross_gratuity_cents: 5000, completed_at: new Date().toISOString(), settlement_state: "pending" },
  { swifttip_reference: "ST-DEMO-002", gross_gratuity_cents: 2000, completed_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(), settlement_state: "succeeded" },
  { swifttip_reference: "ST-DEMO-003", gross_gratuity_cents: 10000, completed_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), settlement_state: "succeeded" }
];

function statusLabel(state: string) {
  if (state === "succeeded") return "Settled";
  if (["failed", "exception", "reversed"].includes(state)) return "Settlement issue";
  return "Processing";
}

function statusClass(state: string) {
  if (state === "succeeded") return "status-chip success";
  return "status-chip warning";
}

function localTime(value: string | null) {
  if (!value) return "Processing";
  return new Intl.DateTimeFormat("en-ZA", { timeZone: "Africa/Johannesburg", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export default async function WorkerPage() {
  const access = await requireWorkerSurface();
  let context = demoContext;
  let month = demoMonth;
  let today = demoToday;
  let tips = demoTips;

  if (access.mode === "live") {
    const supabase = await createSupabaseServerClient();
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const tomorrow = new Date(todayStart);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [contextResult, monthResult, todayResult, tipsResult] = await Promise.all([
      supabase.rpc("get_worker_context"),
      supabase.rpc("get_worker_summary", { p_from: monthStart.toISOString(), p_to: now.toISOString() }),
      supabase.rpc("get_worker_summary", { p_from: todayStart.toISOString(), p_to: tomorrow.toISOString() }),
      supabase.rpc("get_worker_recent_tips", { p_limit: 5 })
    ]);

    if (contextResult.data?.[0]) context = contextResult.data[0] as WorkerContext;
    if (monthResult.data?.[0]) month = monthResult.data[0] as WorkerSummary;
    if (todayResult.data?.[0]) today = todayResult.data[0] as WorkerSummary;
    tips = (tipsResult.data ?? []) as WorkerTip[];
  }

  const active = context.worker_status === "active" && context.endpoint_status === "active";
  const qrHref = context.public_token ? `/tip/${encodeURIComponent(context.public_token)}` : "/worker/profile";

  return (
    <main className="mobile-app-shell">
      <div className="app-page">
        <header className="topbar"><div className="brand-lockup"><AppMark size={38}/><strong>SwiftTip</strong></div><span className={active ? "status-chip success" : "status-chip warning"}>{active ? "✓ Ready" : "Action required"}</span></header>
        {access.mode === "demo" && <p className="prototype-warning">Preview data only — live worker data requires the new MVP v3 database.</p>}
        <section className="dashboard-title"><span className="eyebrow">Worker</span><h1>Good day, {context.display_name} 👋</h1><p className="lead">{active ? `Ready to receive tips${context.venue_name ? ` at ${context.venue_name}` : ""}.` : "Complete the outstanding activation steps before receiving new tips."}</p></section>
        <div className="metric-grid" style={{ marginTop: 22 }}>
          <article className="metric-card"><span>Today's gross tips</span><strong>{formatZar(Number(today.gross_gratuity_cents))}</strong><small>{Number(today.successful_tip_count)} tips</small></article>
          <article className="metric-card"><span>This month</span><strong>{formatZar(Number(month.gross_gratuity_cents))}</strong><small>Gross tips</small></article>
          <article className="metric-card"><span>Processing</span><strong>{formatZar(Number(month.processing_cents))}</strong><small>Awaiting settlement</small></article>
          <article className="metric-card"><span>Settled</span><strong>{formatZar(Number(month.settled_cents))}</strong><small>This month</small></article>
        </div>
        <section className="dashboard-section"><div className="section-heading"><h2>Recent tips</h2><Link className="action-link" href="/worker/transactions">View all</Link></div>{tips.length ? tips.map((tip) => <Link className="list-row" href={`/worker/transactions/${encodeURIComponent(tip.swifttip_reference)}`} key={tip.swifttip_reference}><div><strong>{formatZar(Number(tip.gross_gratuity_cents))}</strong><div className="meta">{localTime(tip.completed_at)}</div></div><span className={statusClass(tip.settlement_state)}>{statusLabel(tip.settlement_state)}</span></Link>) : <div className="empty-state"><strong>No tips yet</strong><p>Your SwiftTip transactions will appear here after a successful customer payment.</p></div>}</section>
        <section className="dashboard-section"><h2>Your QR</h2><p className="lead">Your venue-context QR never contains banking details or a stored-value balance.</p><Link className="button button-primary" href="/worker/qr" style={{ marginTop: 15 }}>Show my QR</Link><Link className="action-link" href={qrHref} style={{ display: "inline-block", marginTop: 14 }}>Preview customer view</Link></section>
        <div className="nav-clearance"/>
      </div>
      <BottomNav active="worker"/>
    </main>
  );
}

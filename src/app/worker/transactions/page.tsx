import Link from "next/link";
import { WorkerBottomNav } from "@/components/WorkerBottomNav";
import { requireWorkerSurface } from "@/lib/access";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { formatZar } from "@/lib/money";

type WorkerTip = {
  swifttip_reference: string;
  gross_gratuity_cents: number;
  worker_fee_cents: number;
  worker_net_cents: number;
  completed_at: string | null;
  settlement_state: string;
};

const demoTips: WorkerTip[] = [
  { swifttip_reference: "ST-DEMO-001", gross_gratuity_cents: 5000, worker_fee_cents: 250, worker_net_cents: 4750, completed_at: new Date().toISOString(), settlement_state: "pending" },
  { swifttip_reference: "ST-DEMO-002", gross_gratuity_cents: 2000, worker_fee_cents: 100, worker_net_cents: 1900, completed_at: new Date(Date.now() - 3600000).toISOString(), settlement_state: "succeeded" },
  { swifttip_reference: "ST-DEMO-003", gross_gratuity_cents: 10000, worker_fee_cents: 500, worker_net_cents: 9500, completed_at: new Date(Date.now() - 86400000).toISOString(), settlement_state: "succeeded" }
];

function label(state: string) {
  if (state === "succeeded") return "Settled";
  if (["failed", "exception", "reversed"].includes(state)) return "Needs attention";
  return "Processing";
}

function dateLabel(value: string | null) {
  if (!value) return "Processing";
  return new Intl.DateTimeFormat("en-ZA", { timeZone: "Africa/Johannesburg", dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default async function WorkerTransactionsPage() {
  const access = await requireWorkerSurface();
  let tips = demoTips;
  if (access.mode === "live") {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.rpc("get_worker_recent_tips", { p_limit: 100 });
    tips = (data ?? []) as WorkerTip[];
  }

  const totalNet = tips.reduce((sum, tip) => sum + Number(tip.worker_net_cents), 0);
  const processingNet = tips.filter(tip => tip.settlement_state !== "succeeded" && !["failed", "exception", "reversed"].includes(tip.settlement_state)).reduce((sum, tip) => sum + Number(tip.worker_net_cents), 0);

  return (
    <main className="mobile-app-shell">
      <div className="app-page worker-home-page">
        <header className="simple-header"><Link className="back-link" href="/worker">←</Link><strong>Your tips</strong><span style={{ width: 42 }} /></header>
        {access.mode === "demo" && <div className="state-banner warning"><span className="state-icon">i</span><div className="state-copy"><strong>Preview activity</strong><p>These example transactions are not real Worker earnings.</p></div></div>}

        <section className="dashboard-title"><span className="eyebrow">Transaction history</span><h1>Every tip, clearly traced.</h1><p className="lead">Your amount, SwiftTip fee and Settlement status stay separate on every transaction.</p></section>

        <div className="transaction-summary-bar">
          <article><span>Your amount shown below</span><strong>{formatZar(totalNet)}</strong></article>
          <article><span>Still processing</span><strong>{formatZar(processingNet)}</strong></article>
        </div>

        <section className="dashboard-section transaction-list">
          {tips.length ? tips.map((tip) => (
            <Link className="transaction-row" href={`/worker/transactions/${encodeURIComponent(tip.swifttip_reference)}`} key={tip.swifttip_reference}>
              <div className="transaction-primary"><span className="transaction-icon">R</span><div className="transaction-amount"><strong>{formatZar(Number(tip.worker_net_cents))}</strong><span>{dateLabel(tip.completed_at)} · Gross tip {formatZar(Number(tip.gross_gratuity_cents))}</span></div></div>
              <div className="transaction-net"><strong>{tip.swifttip_reference}</strong><span className={tip.settlement_state === "succeeded" ? "status-chip success" : "status-chip warning"}>{label(tip.settlement_state)}</span></div>
            </Link>
          )) : <div className="empty-state-polished"><span className="empty-icon">R</span><strong>No tips yet</strong><p>Successful customer gratuities will appear here with your amount and Settlement status.</p><Link className="button button-primary" href="/worker/qr">Show my QR</Link></div>}
        </section>
        <p className="customer-footnote">Settlement status is based on canonical provider/reconciliation evidence, not simply the customer's payment screen.</p>
        <div className="nav-clearance"/>
      </div>
      <WorkerBottomNav active="tips"/>
    </main>
  );
}

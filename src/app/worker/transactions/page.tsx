import Link from "next/link";
import { BottomNav } from "@/components/BottomNav";
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
  if (["failed", "exception", "reversed"].includes(state)) return "Settlement issue";
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

  return (
    <main className="mobile-app-shell">
      <div className="app-page">
        <header className="simple-header"><Link className="back-link" href="/worker">←</Link><strong>Transactions</strong><span style={{ width: 42 }} /></header>
        {access.mode === "demo" && <p className="prototype-warning">Preview data only.</p>}
        <section className="dashboard-title"><span className="eyebrow">Your tips</span><h1>Transaction history</h1><p className="lead">Gross tip, SwiftTip success fee, your amount and Settlement status remain separate and traceable.</p></section>
        <section className="dashboard-section">
          {tips.length ? tips.map((tip) => (
            <Link className="list-row" href={`/worker/transactions/${encodeURIComponent(tip.swifttip_reference)}`} key={tip.swifttip_reference}>
              <div><strong>{formatZar(Number(tip.gross_gratuity_cents))}</strong><div className="meta">{dateLabel(tip.completed_at)} · Your amount {formatZar(Number(tip.worker_net_cents))}</div></div>
              <span className={tip.settlement_state === "succeeded" ? "status-chip success" : "status-chip warning"}>{label(tip.settlement_state)}</span>
            </Link>
          )) : <div className="empty-state"><strong>No transactions yet</strong><p>Successful customer tips will appear here.</p><Link className="button button-primary" href="/worker/qr">Show my QR</Link></div>}
        </section>
        <div className="nav-clearance"/>
      </div>
      <BottomNav active="worker"/>
    </main>
  );
}

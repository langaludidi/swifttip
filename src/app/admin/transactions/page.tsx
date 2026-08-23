import Link from "next/link";
import { requireAdminRole } from "@/lib/access";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { formatZar } from "@/lib/money";

type Transaction = {
  swifttip_reference: string;
  completed_at: string | null;
  worker_display_name: string;
  venue_name: string;
  gross_gratuity_cents: number;
  contribution_cents: number;
  settlement_state: string;
};

export default async function AdminTransactionsPage() {
  const access = await requireAdminRole(["operations_admin", "finance_admin", "super_admin"]);
  let transactions: Transaction[] = access.mode === "demo" ? [
    { swifttip_reference: "ST-26-8F3K9D", completed_at: new Date().toISOString(), worker_display_name: "Thando", venue_name: "Riverside Service Station", gross_gratuity_cents: 5000, contribution_cents: 210, settlement_state: "pending" },
    { swifttip_reference: "ST-26-7Q9M2A", completed_at: new Date(Date.now() - 3600000).toISOString(), worker_display_name: "Nomsa", venue_name: "Riverside Service Station", gross_gratuity_cents: 10000, contribution_cents: 438, settlement_state: "exception" }
  ] : [];

  if (access.mode === "live") {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.rpc("admin_get_recent_transactions", { p_limit: 100 });
    transactions = (data ?? []) as Transaction[];
  }

  return <main className="dashboard-shell"><header className="dashboard-topbar"><div><span className="eyebrow">Finance & operations</span><h1>Transactions</h1></div><Link className="action-link" href="/admin">Overview</Link></header>{access.mode === "demo" && <p className="prototype-warning">Preview data only.</p>}<section className="dashboard-section"><div className="section-heading"><h2>Successful Tips</h2><span className="meta">Up to 100 most recent</span></div>{transactions.length ? transactions.map((tx) => <Link className="queue-row" href={`/admin/transactions/${encodeURIComponent(tx.swifttip_reference)}`} key={tx.swifttip_reference}><div><strong>{tx.swifttip_reference}</strong><div className="meta">{tx.worker_display_name} · {tx.venue_name}</div></div><div style={{ textAlign: "right" }}><strong>{formatZar(Number(tx.gross_gratuity_cents))}</strong><div className="meta">Contribution {formatZar(Number(tx.contribution_cents))} · {tx.settlement_state}</div></div></Link>) : <div className="empty-state"><strong>No completed Tips</strong><p>Successful live transactions will appear here.</p></div>}</section></main>;
}

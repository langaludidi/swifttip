import Link from "next/link";
import { requireAdminRole } from "@/lib/access";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { formatZar } from "@/lib/money";

type SettlementException = {
  settlement_id: string;
  swifttip_reference: string;
  worker_display_name: string;
  venue_name: string;
  settlement_state: string;
  expected_amount_cents: number;
  actual_amount_cents: number | null;
  provider_code: string;
  provider_settlement_ref: string | null;
  created_at: string;
};

export default async function AdminSettlementsPage() {
  const access = await requireAdminRole(["operations_admin", "finance_admin", "super_admin"]);
  let exceptions: SettlementException[] = access.mode === "demo" ? [{ settlement_id: "demo", swifttip_reference: "ST-26-7Q9M2A", worker_display_name: "Nomsa", venue_name: "Riverside Service Station", settlement_state: "exception", expected_amount_cents: 9500, actual_amount_cents: 9400, provider_code: "unconfigured", provider_settlement_ref: "demo-ref", created_at: new Date().toISOString() }] : [];

  if (access.mode === "live") {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.rpc("admin_get_settlement_exceptions", { p_limit: 100 });
    exceptions = (data ?? []) as SettlementException[];
  }

  return <main className="dashboard-shell"><header className="dashboard-topbar"><div><span className="eyebrow">Finance operations</span><h1>Settlement exceptions</h1><p className="lead">Only provider-evidenced Worker Settlement states appear here.</p></div><Link className="action-link" href="/admin">Overview</Link></header>{access.mode === "demo" && <p className="prototype-warning">Preview data only.</p>}<section className="dashboard-section">{exceptions.length ? exceptions.map((item) => <Link className="queue-row" href={`/admin/transactions/${encodeURIComponent(item.swifttip_reference)}`} key={item.settlement_id}><div><strong>{item.worker_display_name}</strong><div className="meta">{item.swifttip_reference} · {item.venue_name} · {item.provider_code}</div></div><div style={{ textAlign: "right" }}><span className="status-chip warning">{item.settlement_state}</span><div className="meta">Expected {formatZar(Number(item.expected_amount_cents))}{item.actual_amount_cents == null ? "" : ` · Actual ${formatZar(Number(item.actual_amount_cents))}`}</div></div></Link>) : <div className="empty-state"><strong>No Settlement exceptions</strong><p>Current Worker Settlements are not reporting failed, held or mismatched states.</p></div>}</section></main>;
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminRole } from "@/lib/access";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { formatZar } from "@/lib/money";

type Detail = {
  swifttip_reference: string;
  worker_display_name: string;
  worker_role: string | null;
  venue_name: string;
  completed_at: string | null;
  customer_total_cents: number;
  gross_gratuity_cents: number;
  customer_fee_cents: number;
  worker_fee_cents: number;
  worker_net_cents: number;
  swifttip_gross_revenue_cents: number;
  provider_cost_cents: number;
  contribution_cents: number;
  payment_state: string | null;
  provider_payment_ref: string | null;
  settlement_state: string;
  expected_settlement_cents: number | null;
  actual_settlement_cents: number | null;
  provider_settlement_ref: string | null;
  reconciliation_status: string;
};

const demo: Detail = { swifttip_reference: "ST-26-8F3K9D", worker_display_name: "Thando", worker_role: "Fuel Attendant", venue_name: "Riverside Service Station", completed_at: new Date().toISOString(), customer_total_cents: 5250, gross_gratuity_cents: 5000, customer_fee_cents: 250, worker_fee_cents: 250, worker_net_cents: 4750, swifttip_gross_revenue_cents: 500, provider_cost_cents: 290, contribution_cents: 210, payment_state: "succeeded", provider_payment_ref: "provider-demo", settlement_state: "pending", expected_settlement_cents: 4750, actual_settlement_cents: null, provider_settlement_ref: null, reconciliation_status: "pending" };

export default async function AdminTransactionDetailPage({ params }: { params: Promise<{ reference: string }> }) {
  const access = await requireAdminRole(["operations_admin", "finance_admin", "super_admin"]);
  const { reference } = await params;
  let detail: Detail | null = access.mode === "demo" ? { ...demo, swifttip_reference: reference } : null;
  if (access.mode === "live") {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.rpc("admin_get_transaction_detail", { p_reference: reference });
    if (data?.[0]) detail = data[0] as Detail;
  }
  if (!detail) notFound();

  return <main className="dashboard-shell"><header className="dashboard-topbar"><div><span className="eyebrow">Transaction</span><h1>{detail.swifttip_reference}</h1><p className="lead">{detail.worker_display_name} · {detail.worker_role ?? "Worker"} · {detail.venue_name}</p></div><Link className="action-link" href="/admin/transactions">Transactions</Link></header>{access.mode === "demo" && <p className="prototype-warning">Preview data only — provider cost is illustrative.</p>}<div className="admin-grid"><section className="dashboard-section"><h2>Financial breakdown</h2><div className="money-breakdown"><div className="money-row"><span>Customer paid</span><strong>{formatZar(Number(detail.customer_total_cents))}</strong></div><div className="money-row"><span>Gross gratuity</span><strong>{formatZar(Number(detail.gross_gratuity_cents))}</strong></div><div className="money-row"><span>Customer service fee</span><strong>{formatZar(Number(detail.customer_fee_cents))}</strong></div><div className="money-row"><span>Worker success fee</span><strong>{formatZar(Number(detail.worker_fee_cents))}</strong></div><div className="money-row"><span>Worker net entitlement</span><strong>{formatZar(Number(detail.worker_net_cents))}</strong></div><div className="money-row"><span>SwiftTip gross revenue</span><strong>{formatZar(Number(detail.swifttip_gross_revenue_cents))}</strong></div><div className="money-row"><span>Provider direct cost</span><strong>− {formatZar(Number(detail.provider_cost_cents))}</strong></div><div className="money-row total"><span>Transaction contribution</span><strong>{formatZar(Number(detail.contribution_cents))}</strong></div></div></section><section className="dashboard-section"><h2>Financial truth</h2><div className="list-row"><strong>Payment</strong><span className={detail.payment_state === "succeeded" ? "status-chip success" : "status-chip warning"}>{detail.payment_state ?? "unknown"}</span></div><div className="list-row"><strong>Settlement</strong><span className={detail.settlement_state === "succeeded" ? "status-chip success" : "status-chip warning"}>{detail.settlement_state}</span></div><div className="list-row"><strong>Reconciliation</strong><span className={detail.reconciliation_status === "reconciled" ? "status-chip success" : "status-chip warning"}>{detail.reconciliation_status}</span></div><div className="money-breakdown" style={{ marginTop: 18 }}><div className="money-row"><span>Expected Worker Settlement</span><strong>{formatZar(Number(detail.expected_settlement_cents ?? detail.worker_net_cents))}</strong></div><div className="money-row"><span>Actual Worker Settlement</span><strong>{detail.actual_settlement_cents == null ? "Pending" : formatZar(Number(detail.actual_settlement_cents))}</strong></div></div><p className="fee-note">Provider payment ref: {detail.provider_payment_ref ?? "Not yet available"}<br/>Provider Settlement ref: {detail.provider_settlement_ref ?? "Not yet available"}</p></section></div><section className="dashboard-section"><h2>Interpretation</h2><p className="lead">Payment, Worker entitlement, Settlement and reconciliation are separate records. No UI action on this page can fabricate provider success or rewrite the original transaction economics.</p></section></main>;
}

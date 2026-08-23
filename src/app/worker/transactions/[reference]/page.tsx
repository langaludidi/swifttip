import Link from "next/link";
import { notFound } from "next/navigation";
import { requireWorkerSurface } from "@/lib/access";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { formatZar } from "@/lib/money";

type Detail = {
  swifttip_reference: string;
  gross_gratuity_cents: number;
  worker_fee_cents: number;
  worker_net_cents: number;
  currency: string;
  venue_name: string;
  worker_role: string | null;
  completed_at: string | null;
  payment_state: string | null;
  payment_provider_completed_at: string | null;
  settlement_state: string;
  settlement_expected_cents: number | null;
  settlement_actual_cents: number | null;
  settlement_completed_at: string | null;
  settlement_provider_ref: string | null;
};

function dateLabel(value: string | null) {
  if (!value) return "Not yet confirmed";
  return new Intl.DateTimeFormat("en-ZA", { timeZone: "Africa/Johannesburg", dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function settlementLabel(state: string) {
  if (state === "succeeded") return "Settled";
  if (state === "failed") return "Settlement failed";
  if (state === "exception") return "Settlement exception";
  if (state === "reversed") return "Settlement reversed";
  if (state === "held") return "Settlement held";
  return "Processing";
}

export default async function WorkerTransactionDetailPage({ params }: { params: Promise<{ reference: string }> }) {
  const access = await requireWorkerSurface();
  const { reference } = await params;
  let detail: Detail | null = null;

  if (access.mode === "demo") {
    detail = {
      swifttip_reference: reference,
      gross_gratuity_cents: 5000,
      worker_fee_cents: 250,
      worker_net_cents: 4750,
      currency: "ZAR",
      venue_name: "Riverside Service Station",
      worker_role: "Fuel Attendant",
      completed_at: new Date().toISOString(),
      payment_state: "succeeded",
      payment_provider_completed_at: new Date().toISOString(),
      settlement_state: "pending",
      settlement_expected_cents: 4750,
      settlement_actual_cents: null,
      settlement_completed_at: null,
      settlement_provider_ref: null
    };
  } else {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("get_worker_tip_detail", { p_reference: reference });
    if (!error && data?.[0]) detail = data[0] as Detail;
  }

  if (!detail) notFound();
  const settledValue = detail.settlement_actual_cents ?? detail.settlement_expected_cents ?? detail.worker_net_cents;
  const settled = detail.settlement_state === "succeeded";
  const paymentReceived = detail.payment_state === "succeeded";

  return (
    <main className="flow-shell customer-flow-page">
      <div className="flow-page">
        <header className="simple-header"><Link className="back-link" href="/worker/transactions">←</Link><strong>Tip detail</strong><span style={{ width: 42 }} /></header>
        {access.mode === "demo" && <div className="state-banner warning"><span className="state-icon">i</span><div className="state-copy"><strong>Preview transaction</strong><p>This is example data only.</p></div></div>}
        <section className="tip-flow">
          <span className="eyebrow">{detail.swifttip_reference}</span>
          <h1>You receive {formatZar(Number(detail.worker_net_cents))}.</h1>
          <p className="lead">From a {formatZar(Number(detail.gross_gratuity_cents))} gratuity at {detail.venue_name}{detail.worker_role ? ` · ${detail.worker_role}` : ""}.</p>

          <div className="money-breakdown polished-money-breakdown" style={{ marginTop: 24 }}>
            <div className="money-row"><span>Customer gratuity</span><strong>{formatZar(Number(detail.gross_gratuity_cents))}</strong></div>
            <div className="money-row"><span>SwiftTip success fee</span><strong>− {formatZar(Number(detail.worker_fee_cents))}</strong></div>
            <div className="money-row total"><span>Your amount</span><strong>{formatZar(Number(detail.worker_net_cents))}</strong></div>
          </div>

          <section className="dashboard-section">
            <span className="eyebrow">1 · Customer payment</span>
            <div className="list-row"><div><strong>{paymentReceived ? "Payment received" : "Payment processing"}</strong><div className="meta">{dateLabel(detail.payment_provider_completed_at ?? detail.completed_at)}</div></div><span className={paymentReceived ? "status-chip success" : "status-chip warning"}>{paymentReceived ? "Received" : "Processing"}</span></div>
          </section>

          <section className="dashboard-section">
            <span className="eyebrow">2 · Your Settlement</span>
            <div className="list-row"><div><strong>{settlementLabel(detail.settlement_state)}</strong><div className="meta">{settled ? `${formatZar(Number(settledValue))} · ${dateLabel(detail.settlement_completed_at)}` : `Expected amount ${formatZar(Number(detail.worker_net_cents))}`}</div></div><span className={settled ? "status-chip success" : "status-chip warning"}>{settlementLabel(detail.settlement_state)}</span></div>
            {detail.settlement_provider_ref && <div className="privacy-inline"><span>#</span><p>Settlement reference: <strong>{detail.settlement_provider_ref}</strong></p></div>}
          </section>

          <div className="privacy-inline"><span>i</span><p><strong>Received</strong> confirms the customer's payment. <strong>Settled</strong> is shown only after authoritative provider Settlement evidence exists.</p></div>
          {!settled && <Link className="button button-secondary" href="/worker/support" style={{marginTop:16}}>Need help with this transaction?</Link>}
        </section>
      </div>
    </main>
  );
}

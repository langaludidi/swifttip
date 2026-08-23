import Link from "next/link";
import { formatZar } from "@/lib/money";
import { requireAdminRole } from "@/lib/access";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";

type Readiness = {
  draft_pricing_versions: number;
  active_pricing_versions: number;
  worker_terms_published: boolean;
  venue_terms_published: boolean;
  customer_terms_published: boolean;
  privacy_notice_published: boolean;
  active_venues: number;
  active_workers: number;
  workers_awaiting_activation: number;
  workers_settlement_ready: number;
};

type Pricing = {
  pricing_id: string;
  version_code: string;
  pricing_status: string;
  effective_from: string | null;
  worker_fee_bps: number;
  customer_fixed_fee_cents: number;
  customer_fee_bps: number;
  customer_fee_cap_cents: number | null;
  minimum_gratuity_cents: number;
  maximum_gratuity_cents: number;
  high_value_threshold_cents: number;
};

const demoReadiness: Readiness = {
  draft_pricing_versions: 1,
  active_pricing_versions: 0,
  worker_terms_published: false,
  venue_terms_published: false,
  customer_terms_published: false,
  privacy_notice_published: false,
  active_venues: 0,
  active_workers: 0,
  workers_awaiting_activation: 0,
  workers_settlement_ready: 0
};

const demoPricing: Pricing[] = [{ pricing_id:"demo", version_code:"v3-working-001", pricing_status:"draft", effective_from:null, worker_fee_bps:500, customer_fixed_fee_cents:100, customer_fee_bps:300, customer_fee_cap_cents:500, minimum_gratuity_cents:500, maximum_gratuity_cents:50000, high_value_threshold_cents:20000 }];

function yesNo(value: boolean) {
  return <span className={value ? "status-chip success" : "status-chip warning"}>{value ? "Ready" : "Not ready"}</span>;
}

export default async function AdminReadinessPage() {
  const access = await requireAdminRole(["operations_admin","finance_admin","super_admin"]);
  let readiness = demoReadiness;
  let pricing = demoPricing;

  if (access.mode === "live") {
    const supabase = await createSupabaseServerClient();
    const [readinessResult, pricingResult] = await Promise.all([
      (supabase.rpc as any)("admin_get_commercial_readiness"),
      supabase.rpc("admin_get_pricing_versions")
    ]);
    readiness = ((readinessResult.data ?? []) as Readiness[])[0] ?? demoReadiness;
    pricing = (pricingResult.data ?? []) as Pricing[];
  }

  const configReady = Number(readiness.active_pricing_versions) === 1 && readiness.worker_terms_published && readiness.venue_terms_published && readiness.customer_terms_published && readiness.privacy_notice_published;

  return <main className="dashboard-shell">
    <header className="dashboard-topbar"><div><span className="eyebrow">Go-live control</span><h1>Commercial readiness</h1><p className="lead">A read-only view of the configuration that must exist before SwiftTip can responsibly activate live money.</p></div><Link className="action-link" href="/admin">Overview</Link></header>
    {access.mode === "demo" && <p className="prototype-warning">Preview data only. The live database projection is already implemented.</p>}

    <section className="dashboard-section"><div className="section-heading"><h2>Configuration gate</h2>{yesNo(configReady)}</div><div className="metric-grid" style={{marginTop:18}}><article className="metric-card"><span>Active pricing</span><strong>{Number(readiness.active_pricing_versions)}</strong><small>Exactly one required</small></article><article className="metric-card"><span>Draft pricing</span><strong>{Number(readiness.draft_pricing_versions)}</strong><small>Not used for charging</small></article><article className="metric-card"><span>Active Venues</span><strong>{Number(readiness.active_venues)}</strong></article><article className="metric-card"><span>Active Workers</span><strong>{Number(readiness.active_workers)}</strong></article></div></section>

    <section className="dashboard-section"><h2>Terms and notices</h2><div className="list-row"><strong>Worker terms</strong>{yesNo(readiness.worker_terms_published)}</div><div className="list-row"><strong>Venue terms</strong>{yesNo(readiness.venue_terms_published)}</div><div className="list-row"><strong>Customer transaction terms</strong>{yesNo(readiness.customer_terms_published)}</div><div className="list-row"><strong>Privacy notice</strong>{yesNo(readiness.privacy_notice_published)}</div></section>

    <section className="dashboard-section"><h2>Worker activation</h2><div className="list-row"><div><strong>Awaiting activation</strong><div className="meta">Draft Worker profiles</div></div><strong>{Number(readiness.workers_awaiting_activation)}</strong></div><div className="list-row"><div><strong>Settlement ready</strong><div className="meta">Provider-confirmed settlement readiness</div></div><strong>{Number(readiness.workers_settlement_ready)}</strong></div></section>

    <section className="dashboard-section"><div className="section-heading"><h2>Pricing versions</h2><span className="status-chip warning">Read only</span></div>{pricing.length ? pricing.map(p => <div key={p.pricing_id} className="queue-row"><div><strong>{p.version_code}</strong><div className="meta">Worker {Number(p.worker_fee_bps)/100}% · Customer {formatZar(Number(p.customer_fixed_fee_cents))} + {Number(p.customer_fee_bps)/100}%{p.customer_fee_cap_cents != null ? ` capped at ${formatZar(Number(p.customer_fee_cap_cents))}` : ""}</div><div className="meta">Tip range {formatZar(Number(p.minimum_gratuity_cents))} – {formatZar(Number(p.maximum_gratuity_cents))} · High-value check from {formatZar(Number(p.high_value_threshold_cents))}</div></div><span className={p.pricing_status === "active" ? "status-chip success" : "status-chip warning"}>{p.pricing_status}</span></div>) : <div className="empty-state"><strong>No pricing versions</strong><p>Live charging cannot start without an approved active version.</p></div>}</section>

    <section className="trust-card"><span className="trust-icon">✓</span><div><strong>No accidental activation controls on this page</strong><p>Pricing activation and legal publication are intentionally absent while those commercial/legal decisions remain unresolved. This screen can diagnose readiness but cannot manufacture it.</p></div></section>
  </main>;
}

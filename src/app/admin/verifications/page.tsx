import Link from "next/link";
import { requireAdminRole } from "@/lib/access";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";

type Verification = {
  verification_id: string;
  worker_id: string;
  display_name: string;
  verification_type: string;
  verification_status: string;
  submitted_at: string | null;
  venue_name: string | null;
};

function dateLabel(value: string | null) {
  if (!value) return "Not yet submitted";
  return new Intl.DateTimeFormat("en-ZA", { timeZone: "Africa/Johannesburg", dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default async function AdminVerificationsPage() {
  const access = await requireAdminRole(["operations_admin", "verification_admin", "super_admin"]);
  let queue: Verification[] = access.mode === "demo" ? [{ verification_id: "demo", worker_id: "demo-worker", display_name: "Nomsa", verification_type: "identity", verification_status: "under_review", submitted_at: new Date().toISOString(), venue_name: "Riverside Service Station" }] : [];

  if (access.mode === "live") {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.rpc("admin_get_verification_queue", { p_limit: 100 });
    queue = (data ?? []) as Verification[];
  }

  return <main className="dashboard-shell"><header className="dashboard-topbar"><div><span className="eyebrow">Verification</span><h1>Worker review queue</h1><p className="lead">Review the identity document, live selfie, protected identity claim and duplicate-account result before deciding.</p></div><Link className="action-link" href="/admin">Overview</Link></header>{access.mode === "demo" && <p className="prototype-warning">Preview data only — approval actions are not simulated.</p>}<section className="dashboard-section">{queue.length ? queue.map((item) => <Link className="queue-row" href={`/admin/verifications/${item.verification_id}`} key={item.verification_id}><div><strong>{item.display_name}</strong><div className="meta">{item.venue_name ?? "No Venue context"} · {item.verification_type} · {dateLabel(item.submitted_at)}</div></div><span className="status-chip warning">{item.verification_status.replaceAll("_", " ")} →</span></Link>) : <div className="empty-state"><strong>No verification work waiting</strong><p>Submitted or action-required Worker verifications will appear here.</p></div>}</section><section className="dashboard-section"><h2>Phase 1 review boundary</h2><p className="lead">Approval requires three explicit confirmations: identity details match the document, the live selfie resembles the document photograph, and no duplicate or unexplained inconsistency is present. All decisions are audited.</p></section></main>;
}

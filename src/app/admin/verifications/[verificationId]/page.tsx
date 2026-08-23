import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminRole } from "@/lib/access";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { decideVerification } from "./actions";

type VerificationDetail = {
  verification_id: string;
  worker_id: string;
  legal_first_name: string;
  legal_last_name: string;
  display_name: string;
  verification_type: string;
  verification_status: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  decision_reason: string | null;
  venue_name: string | null;
  document_id: string | null;
  storage_path: string | null;
  document_type: string | null;
  mime_type: string | null;
  file_size_bytes: number | null;
  uploaded_at: string | null;
};

function when(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-ZA", { timeZone: "Africa/Johannesburg", dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function bytes(value: number | null) {
  if (!value) return "—";
  return value < 1024 * 1024 ? `${Math.ceil(value / 1024)} KB` : `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function VerificationReviewPage({ params, searchParams }: { params: Promise<{ verificationId: string }>; searchParams: Promise<{ error?: string; decided?: string }> }) {
  const access = await requireAdminRole(["verification_admin", "super_admin"]);
  const { verificationId } = await params;
  const query = await searchParams;

  let rows: VerificationDetail[] = [];
  let evidenceLinks: Array<{ id: string; label: string; meta: string; url: string }> = [];

  if (access.mode === "demo") {
    rows = [{ verification_id: "demo", worker_id: "demo-worker", legal_first_name: "Nomsa", legal_last_name: "Mokoena", display_name: "Nomsa", verification_type: "identity", verification_status: "submitted", submitted_at: new Date().toISOString(), reviewed_at: null, decision_reason: null, venue_name: "Riverside Service Station", document_id: "demo-document", storage_path: null, document_type: "identity_evidence", mime_type: "application/pdf", file_size_bytes: 182000, uploaded_at: new Date().toISOString() }];
  } else {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("admin_get_verification_detail", { p_verification_id: verificationId });
    if (error || !data?.length) notFound();
    rows = data as VerificationDetail[];

    for (const row of rows) {
      if (!row.document_id || !row.storage_path) continue;
      const { data: signed } = await supabase.storage.from("worker-verification").createSignedUrl(row.storage_path, 300);
      if (signed?.signedUrl) evidenceLinks.push({ id: row.document_id, label: row.document_type ?? "Evidence", meta: `${row.mime_type ?? "file"} · ${bytes(row.file_size_bytes)}`, url: signed.signedUrl });
    }
  }

  const verification = rows[0];
  if (!verification) notFound();
  const canDecide = access.mode === "live" && ["submitted", "under_review"].includes(verification.verification_status);

  return (
    <main className="dashboard-shell">
      <header className="dashboard-topbar"><div><span className="eyebrow">Identity verification</span><h1>{verification.display_name}</h1><p className="lead">Verification evidence is private and should only be used for the decision shown here.</p></div><Link className="action-link" href="/admin/verifications">Back to queue</Link></header>
      {access.mode === "demo" && <p className="prototype-warning">Preview only — evidence links and decisions are disabled.</p>}
      {query.error && <p className="prototype-warning" role="alert">{query.error}</p>}
      {query.decided && <p className="status-chip success" style={{ display: "inline-flex", marginBottom: 16 }}>Decision recorded: {query.decided.replaceAll("_", " ")}</p>}

      <div className="admin-grid">
        <section className="dashboard-section"><h2>Worker identity</h2><div className="money-breakdown"><div className="money-row"><span>Legal name</span><strong>{verification.legal_first_name} {verification.legal_last_name}</strong></div><div className="money-row"><span>Public name</span><strong>{verification.display_name}</strong></div><div className="money-row"><span>Venue context</span><strong>{verification.venue_name ?? "None"}</strong></div><div className="money-row"><span>Submitted</span><strong>{when(verification.submitted_at)}</strong></div><div className="money-row total"><span>Status</span><strong>{verification.verification_status.replaceAll("_", " ")}</strong></div></div>{verification.decision_reason && <p className="fee-note">Previous reviewer note: {verification.decision_reason}</p>}</section>

        <section className="dashboard-section"><h2>Evidence</h2>{access.mode === "demo" ? <div className="list-row"><div><strong>identity_evidence</strong><div className="meta">application/pdf · 178 KB</div></div><span className="status-chip warning">Private</span></div> : evidenceLinks.length ? evidenceLinks.map((item) => <a className="list-row" href={item.url} target="_blank" rel="noreferrer" key={item.id}><div><strong>{item.label}</strong><div className="meta">{item.meta} · link expires in 5 minutes</div></div><span>Open ↗</span></a>) : <div className="empty-state"><strong>No evidence available</strong><p>Do not approve an identity verification without the required evidence.</p></div>}</section>
      </div>

      {canDecide && <section className="dashboard-section"><h2>Decision</h2><div className="admin-grid"><form action={decideVerification} className="stack-actions"><input type="hidden" name="verificationId" value={verification.verification_id}/><input type="hidden" name="decision" value="approve"/><p className="lead">Approve only when the supplied evidence supports the Worker identity.</p><button className="button button-primary" type="submit">Approve verification</button></form><div className="stack-actions"><form action={decideVerification} className="stack-actions"><input type="hidden" name="verificationId" value={verification.verification_id}/><input type="hidden" name="decision" value="request_more_information"/><label className="field-label" htmlFor="more-info-reason">Request more information</label><textarea id="more-info-reason" name="reason" rows={3} required placeholder="What additional evidence is required?"/><button className="button" type="submit">Request more information</button></form><form action={decideVerification} className="stack-actions"><input type="hidden" name="verificationId" value={verification.verification_id}/><input type="hidden" name="decision" value="reject"/><label className="field-label" htmlFor="reject-reason">Reject verification</label><textarea id="reject-reason" name="reason" rows={3} required placeholder="Reason for rejection"/><button className="button" type="submit">Reject verification</button></form></div></div></section>}
    </main>
  );
}

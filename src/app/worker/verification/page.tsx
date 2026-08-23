import Link from "next/link";
import { AppMark } from "@/components/AppMark";
import { BottomNav } from "@/components/BottomNav";
import { requireWorkerSurface } from "@/lib/access";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { submitVerification, uploadVerificationEvidence } from "./actions";

type Verification = {
  id: string;
  verification_status: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  decision_reason: string | null;
};

function statusLabel(status: string) {
  switch (status) {
    case "not_started": return "Evidence required";
    case "submitted": return "Submitted";
    case "under_review": return "Under review";
    case "additional_info_required": return "More information required";
    case "approved": return "Approved";
    case "rejected": return "Not approved";
    case "expired": return "Expired";
    default: return status.replaceAll("_", " ");
  }
}

export default async function WorkerVerificationPage({ searchParams }: { searchParams: Promise<{ error?: string; uploaded?: string; submitted?: string }> }) {
  const access = await requireWorkerSurface();
  const params = await searchParams;
  let verification: Verification | null = access.mode === "demo" ? { id: "demo", verification_status: "not_started", submitted_at: null, reviewed_at: null, decision_reason: null } : null;
  let evidenceCount = 0;

  if (access.mode === "live") {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.from("worker_verifications").select("id,verification_status,submitted_at,reviewed_at,decision_reason").eq("verification_type", "identity").order("created_at", { ascending: false }).limit(1).maybeSingle();
    verification = data as Verification | null;
    if (verification) {
      const contextResult = await supabase.rpc("get_worker_context");
      const workerId = (contextResult.data as Array<{ worker_id: string }> | null)?.[0]?.worker_id;
      if (workerId) {
        const { data: evidence } = await supabase.storage.from("worker-verification").list(`${workerId}/${verification.id}`, { limit: 20 });
        evidenceCount = evidence?.length ?? 0;
      }
    }
  }

  const editable = !verification || ["not_started", "additional_info_required"].includes(verification.verification_status);
  const canSubmit = Boolean(verification && editable && evidenceCount > 0);

  return (
    <main className="mobile-app-shell">
      <div className="app-page">
        <header className="topbar"><div className="brand-lockup"><AppMark size={38}/><strong>SwiftTip</strong></div><Link className="action-link" href="/worker/profile">Profile</Link></header>
        {access.mode === "demo" && <p className="prototype-warning">Preview only — document upload is disabled until the live Supabase environment is connected.</p>}
        {params.error && <p className="prototype-warning" role="alert">{params.error}</p>}
        {params.uploaded && <p className="status-chip success" style={{ display: "inline-flex", marginTop: 16 }}>Evidence uploaded</p>}
        {params.submitted && <p className="status-chip success" style={{ display: "inline-flex", marginTop: 16 }}>Submitted for review</p>}

        <section className="dashboard-title"><span className="eyebrow">Identity verification</span><h1>Confirm who you are.</h1><p className="lead">SwiftTip uses only the evidence needed to verify your Worker identity. Payment-provider KYC and banking verification are handled separately.</p></section>

        <section className="dashboard-section">
          <div className="section-heading"><h2>Status</h2><span className={verification?.verification_status === "approved" ? "status-chip success" : "status-chip warning"}>{statusLabel(verification?.verification_status ?? "not_started")}</span></div>
          <div className="list-row"><div><strong>Evidence files</strong><div className="meta">Private · JPG, PNG or PDF · max 10MB each</div></div><strong>{evidenceCount}</strong></div>
          {verification?.decision_reason && <div className="prototype-warning"><strong>Reviewer note</strong><br/>{verification.decision_reason}</div>}
        </section>

        {editable && access.mode === "live" && <section className="dashboard-section"><h2>Add identity evidence</h2><p className="lead">Upload a clear identity document or supporting image. Files are stored in your private verification folder.</p><form action={uploadVerificationEvidence} className="stack-actions" style={{ marginTop: 18 }}><label className="field-label" htmlFor="evidence">Identity evidence</label><input id="evidence" name="evidence" type="file" accept="image/jpeg,image/png,application/pdf" required/><button className="button button-primary" type="submit">Upload evidence</button></form></section>}

        {canSubmit && access.mode === "live" && <section className="dashboard-section"><h2>Ready for review?</h2><p className="lead">After submission you cannot replace evidence unless a reviewer asks for more information.</p><form action={submitVerification}><input type="hidden" name="verificationId" value={verification!.id}/><button className="button button-primary" type="submit">Submit for review</button></form></section>}

        {verification?.verification_status === "approved" && <section className="trust-card"><span className="trust-icon">✓</span><div><strong>Identity verified</strong><p>Your SwiftTip identity check is approved. Provider settlement readiness remains a separate activation gate.</p></div></section>}
        <div className="nav-clearance"/>
      </div>
      <BottomNav active="profile"/>
    </main>
  );
}

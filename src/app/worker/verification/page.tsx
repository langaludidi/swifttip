import Link from "next/link";
import { AppMark } from "@/components/AppMark";
import { WorkerBottomNav } from "@/components/WorkerBottomNav";
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

  const status = verification?.verification_status ?? "not_started";
  const editable = !verification || ["not_started", "additional_info_required"].includes(status);
  const canSubmit = Boolean(verification && editable && evidenceCount > 0);
  const approved = status === "approved";

  return (
    <main className="mobile-app-shell">
      <div className="app-page worker-home-page">
        <header className="topbar"><div className="brand-lockup"><AppMark size={38}/><div><strong>SwiftTip</strong><span className="brand-subline">Identity check</span></div></div><Link className="compact-link" href="/worker/onboarding">Back to setup</Link></header>

        {access.mode === "demo" && <div className="state-banner warning"><span className="state-icon">i</span><div className="state-copy"><strong>Preview verification flow</strong><p>Document upload is disabled until the staging deployment is connected to Supabase.</p></div></div>}
        {params.error && <div className="state-banner error" role="alert"><span className="state-icon">!</span><div className="state-copy"><strong>Action not completed</strong><p>{params.error}</p></div></div>}
        {params.uploaded && <div className="state-banner success"><span className="state-icon">✓</span><div className="state-copy"><strong>Evidence uploaded</strong><p>You can add another file or submit the evidence for review.</p></div></div>}
        {params.submitted && <div className="state-banner success"><span className="state-icon">✓</span><div className="state-copy"><strong>Submitted for review</strong><p>SwiftTip will update this page when the review is complete.</p></div></div>}

        <section className="dashboard-title"><span className="eyebrow">Identity verification</span><h1>{approved ? "Your identity is verified." : "Confirm who you are."}</h1><p className="lead">SwiftTip reviews the minimum evidence needed to verify your Worker identity. Payment-provider KYC and banking verification remain separate.</p></section>

        <section className="verification-status-hero">
          <span className="eyebrow">Current status</span>
          <h2>{statusLabel(status)}</h2>
          <p>{approved ? "This SwiftTip identity gate is complete." : status === "additional_info_required" ? "A reviewer needs more information before a decision can be made." : ["submitted","under_review"].includes(status) ? "Your evidence is locked while the review is in progress." : "Upload clear evidence, then submit it for review."}</p>
          <div className="evidence-count"><span>Private evidence files</span><strong>{evidenceCount}</strong></div>
        </section>

        {verification?.decision_reason && <div className="state-banner warning"><span className="state-icon">i</span><div className="state-copy"><strong>Reviewer note</strong><p>{verification.decision_reason}</p></div></div>}

        {editable && access.mode === "live" && <section className="dashboard-section"><div className="section-heading"><div><span className="eyebrow">Evidence</span><h2>Add identity evidence</h2></div></div><p className="lead">Use a clear JPG, PNG or PDF. Each file is stored in your private verification folder and is not shown to the Venue or customers.</p><form action={uploadVerificationEvidence} className="stack-actions" style={{ marginTop: 18 }}><label className="file-drop" htmlFor="evidence"><strong>Choose a file</strong><p>JPG, PNG or PDF · maximum 10MB</p><input id="evidence" name="evidence" type="file" accept="image/jpeg,image/png,application/pdf" required/></label><button className="button button-secondary" type="submit">Upload evidence</button></form></section>}

        {canSubmit && access.mode === "live" && <section className="dashboard-section"><span className="eyebrow">Ready for review</span><h2>Submit the evidence?</h2><div className="review-lock-note"><span>i</span><div>After submission, you cannot replace the files unless a reviewer asks for more information.</div></div><form action={submitVerification} style={{marginTop:16}}><input type="hidden" name="verificationId" value={verification!.id}/><button className="button button-primary button-large" style={{width:"100%"}} type="submit">Submit for review</button></form></section>}

        {approved && <section className="trust-card"><span className="trust-icon">✓</span><div style={{flex:1}}><strong>Identity gate complete</strong><p>Your SwiftTip identity check is approved. Return to activation to see the remaining Venue, Settlement and terms checks.</p><Link className="action-link" href="/worker/onboarding" style={{display:"inline-block",marginTop:9}}>Continue activation →</Link></div></section>}
        <div className="nav-clearance"/>
      </div>
      <WorkerBottomNav active="profile"/>
    </main>
  );
}

import Link from "next/link";
import { AppMark } from "@/components/AppMark";
import { WorkerBottomNav } from "@/components/WorkerBottomNav";
import { requireWorkerSurface } from "@/lib/access";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { removeVerificationEvidence, submitVerification, uploadVerificationEvidence } from "./actions";

type Verification = {
  id: string;
  verification_status: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  decision_reason: string | null;
};

type Evidence = {
  document_id: string;
  storage_path: string;
  document_type: string;
  mime_type: string;
  file_size_bytes: number;
  uploaded_at: string;
  storage_object_available: boolean;
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

function fileType(mime: string) {
  if (mime === "application/pdf") return "PDF";
  if (mime === "image/png") return "PNG image";
  return "JPG image";
}

function fileSize(value: number) {
  if (value < 1024 * 1024) return `${Math.max(1, Math.ceil(value / 1024))} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function WorkerVerificationPage({ searchParams }: { searchParams: Promise<{ error?: string; uploaded?: string; removed?: string; submitted?: string }> }) {
  const access = await requireWorkerSurface();
  const params = await searchParams;
  let verification: Verification | null = access.mode === "demo" ? { id: "demo", verification_status: "not_started", submitted_at: null, reviewed_at: null, decision_reason: null } : null;
  let evidence: Evidence[] = [];

  if (access.mode === "live") {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.from("worker_verifications").select("id,verification_status,submitted_at,reviewed_at,decision_reason").eq("verification_type", "identity").order("created_at", { ascending: false }).limit(1).maybeSingle();
    verification = data as Verification | null;
    if (verification) {
      const evidenceResult = await (supabase.rpc as any)("get_worker_verification_documents", { p_verification_id: verification.id });
      evidence = (evidenceResult.data ?? []) as Evidence[];
    }
  }

  const status = verification?.verification_status ?? "not_started";
  const editable = !verification || ["not_started", "additional_info_required"].includes(status);
  const evidenceCount = evidence.length;
  const allEvidenceAvailable = evidence.every((item) => item.storage_object_available);
  const canUpload = editable && evidenceCount < 5;
  const canSubmit = Boolean(verification && editable && evidenceCount > 0 && allEvidenceAvailable);
  const approved = status === "approved";

  return (
    <main className="mobile-app-shell">
      <div className="app-page worker-home-page">
        <header className="topbar"><div className="brand-lockup"><AppMark size={38}/><div><strong>SwiftTip</strong><span className="brand-subline">Identity check</span></div></div><Link className="compact-link" href="/worker/onboarding">Back to setup</Link></header>

        {access.mode === "demo" && <div className="state-banner warning"><span className="state-icon">i</span><div className="state-copy"><strong>Preview verification flow</strong><p>Document upload is disabled in demo mode.</p></div></div>}
        {params.error && <div className="state-banner error" role="alert"><span className="state-icon">!</span><div className="state-copy"><strong>Action not completed</strong><p>{params.error}</p></div></div>}
        {params.uploaded && <div className="state-banner success"><span className="state-icon">✓</span><div className="state-copy"><strong>Evidence added</strong><p>The file is registered to this identity check. You can add another or submit for review.</p></div></div>}
        {params.removed && <div className="state-banner success"><span className="state-icon">✓</span><div className="state-copy"><strong>Evidence removed</strong><p>The private file and its active verification record have been removed.</p></div></div>}
        {params.submitted && <div className="state-banner success"><span className="state-icon">✓</span><div className="state-copy"><strong>Submitted for review</strong><p>Your evidence is now locked while SwiftTip reviews it.</p></div></div>}

        <section className="dashboard-title"><span className="eyebrow">Identity verification</span><h1>{approved ? "Your identity is verified." : "Confirm who you are."}</h1><p className="lead">SwiftTip reviews the minimum evidence needed to verify your Worker identity. Payment-provider KYC and banking verification remain separate.</p></section>

        <section className="verification-status-hero">
          <span className="eyebrow">Current status</span>
          <h2>{statusLabel(status)}</h2>
          <p>{approved ? "This SwiftTip identity gate is complete." : status === "additional_info_required" ? "A reviewer needs more information before a decision can be made." : ["submitted","under_review"].includes(status) ? "Your evidence is locked while the review is in progress." : "Upload clear evidence, then submit it for review."}</p>
          <div className="evidence-count"><span>Registered private evidence</span><strong>{evidenceCount}/5</strong></div>
        </section>

        {verification?.decision_reason && <div className="state-banner warning"><span className="state-icon">i</span><div className="state-copy"><strong>Reviewer note</strong><p>{verification.decision_reason}</p></div></div>}

        {access.mode === "live" && verification && evidenceCount > 0 && <section className="dashboard-section"><div className="section-heading"><div><span className="eyebrow">Private evidence</span><h2>Files in this identity check</h2></div></div><p className="lead">Only evidence registered to this verification is shown here. Venue users and customers cannot access these files.</p><div style={{marginTop:16}}>{evidence.map((item,index) => <div className="list-row" key={item.document_id}><div style={{minWidth:0}}><strong>Identity evidence {index + 1}</strong><div className="meta">{fileType(item.mime_type)} · {fileSize(Number(item.file_size_bytes))}</div>{!item.storage_object_available && <div className="meta" style={{marginTop:4}}>File unavailable — remove this record and upload the evidence again.</div>}</div><div style={{display:"flex",alignItems:"center",gap:10}}><span className={item.storage_object_available ? "status-chip success" : "status-chip warning"}>{item.storage_object_available ? "Available" : "Missing"}</span>{editable && <form action={removeVerificationEvidence}><input type="hidden" name="documentId" value={item.document_id}/><button className="compact-link" type="submit">Remove</button></form>}</div></div>)}</div></section>}

        {canUpload && access.mode === "live" && <section className="dashboard-section"><div className="section-heading"><div><span className="eyebrow">Evidence</span><h2>Add identity evidence</h2></div><span className="status-chip">{evidenceCount}/5 files</span></div><p className="lead">Use a clear JPG, PNG or PDF. Files are stored in your private verification folder and cannot be overwritten after registration.</p><form action={uploadVerificationEvidence} className="stack-actions" style={{ marginTop: 18 }}><label className="file-drop" htmlFor="evidence"><strong>Choose a file</strong><p>JPG, PNG or PDF · maximum 10MB · up to 5 files</p><input id="evidence" name="evidence" type="file" accept="image/jpeg,image/png,application/pdf" required/></label><button className="button button-secondary" type="submit">Upload evidence</button></form></section>}

        {editable && evidenceCount >= 5 && <div className="state-banner warning"><span className="state-icon">i</span><div className="state-copy"><strong>Five-file limit reached</strong><p>Remove an unnecessary file before adding another.</p></div></div>}
        {editable && evidenceCount > 0 && !allEvidenceAvailable && <div className="state-banner error"><span className="state-icon">!</span><div className="state-copy"><strong>Evidence needs attention</strong><p>A registered file is no longer available in private storage. Remove the unavailable record and upload the evidence again before submitting.</p></div></div>}

        {canSubmit && access.mode === "live" && <section className="dashboard-section"><span className="eyebrow">Ready for review</span><h2>Submit the evidence?</h2><div className="review-lock-note"><span>i</span><div>After submission, the registered files are locked. You can change evidence only if a reviewer requests more information.</div></div><form action={submitVerification} style={{marginTop:16}}><input type="hidden" name="verificationId" value={verification!.id}/><button className="button button-primary button-large" style={{width:"100%"}} type="submit">Submit for review</button></form></section>}

        {approved && <section className="trust-card"><span className="trust-icon">✓</span><div style={{flex:1}}><strong>Identity gate complete</strong><p>Your SwiftTip identity check is approved. Return to activation to see the remaining Venue, Settlement and terms checks.</p><Link className="action-link" href="/worker/onboarding" style={{display:"inline-block",marginTop:9}}>Continue activation →</Link></div></section>}
        <div className="nav-clearance"/>
      </div>
      <WorkerBottomNav active="profile"/>
    </main>
  );
}

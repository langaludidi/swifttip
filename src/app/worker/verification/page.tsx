import Link from "next/link";
import { AppMark } from "@/components/AppMark";
import { WorkerBottomNav } from "@/components/WorkerBottomNav";
import { requireWorkerSurface } from "@/lib/access";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { removeVerificationEvidence, saveIdentityDetails, submitVerification, uploadVerificationEvidence } from "./actions";
import { LiveSelfieCapture } from "./LiveSelfieCapture";

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

type IdentityClaim = {
  document_type: string;
  identity_number_last4: string;
  consent_version: string;
  consented_at: string;
  selfie_capture_attested: boolean;
  selfie_capture_method: string | null;
  selfie_captured_at: string | null;
};

type WorkerIdentity = { legal_first_name: string; legal_last_name: string };

function statusLabel(status: string, readyToSubmit: boolean, progressStarted: boolean) {
  switch (status) {
    case "not_started": return readyToSubmit ? "Ready to submit for review" : progressStarted ? "Identity check in progress" : "Identity details required";
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

export default async function WorkerVerificationPage({ searchParams }: { searchParams: Promise<{ error?: string; details?: string; uploaded?: string; selfie?: string; removed?: string; submitted?: string }> }) {
  const access = await requireWorkerSurface();
  const params = await searchParams;
  let verification: Verification | null = access.mode === "demo" ? { id: "demo", verification_status: "not_started", submitted_at: null, reviewed_at: null, decision_reason: null } : null;
  let evidence: Evidence[] = [];
  let claim: IdentityClaim | null = null;
  let worker: WorkerIdentity = { legal_first_name: "", legal_last_name: "" };

  if (access.mode === "live") {
    const supabase = await createSupabaseServerClient();
    const [{ data }, claimResult, workerResult] = await Promise.all([
      supabase.from("worker_verifications").select("id,verification_status,submitted_at,reviewed_at,decision_reason").eq("verification_type", "identity").order("created_at", { ascending: false }).limit(1).maybeSingle(),
      (supabase.rpc as any)("get_worker_identity_claim"),
      supabase.from("workers").select("legal_first_name,legal_last_name").eq("user_id", access.userId).maybeSingle()
    ]);
    verification = data as Verification | null;
    claim = (claimResult.data?.[0] ?? null) as IdentityClaim | null;
    if (workerResult.data) worker = workerResult.data as WorkerIdentity;
    if (verification) {
      const evidenceResult = await (supabase.rpc as any)("get_worker_verification_documents", { p_verification_id: verification.id });
      evidence = (evidenceResult.data ?? []) as Evidence[];
    }
  }

  const status = verification?.verification_status ?? "not_started";
  const editable = !verification || ["not_started", "additional_info_required"].includes(status);
  const evidenceCount = evidence.length;
  const identityEvidence = evidence.filter((item) => ["identity_document", "identity_evidence"].includes(item.document_type));
  const selfieEvidence = evidence.find((item) => item.document_type === "live_selfie") ?? null;
  const allEvidenceAvailable = evidence.every((item) => item.storage_object_available);
  const canUpload = editable && identityEvidence.length < 5;
  const identityDetailsComplete = Boolean(claim?.consent_version === "identity-pilot-v1");
  const selfieComplete = Boolean(selfieEvidence?.storage_object_available && claim?.selfie_capture_attested);
  const canSubmit = Boolean(verification && editable && identityDetailsComplete && identityEvidence.some((item) => item.storage_object_available) && selfieComplete && allEvidenceAvailable);
  const approved = status === "approved";

  return (
    <main className="mobile-app-shell">
      <div className="app-page worker-home-page">
        <header className="topbar"><div className="brand-lockup"><AppMark size={38}/><div><strong>SwiftTip</strong><span className="brand-subline">Identity check</span></div></div><Link className="compact-link" href="/worker/onboarding">Back to setup</Link></header>

        {access.mode === "demo" && <div className="state-banner warning"><span className="state-icon">i</span><div className="state-copy"><strong>Preview verification flow</strong><p>Document upload is disabled in demo mode.</p></div></div>}
        {params.error && <div className="state-banner error" role="alert"><span className="state-icon">!</span><div className="state-copy"><strong>Action not completed</strong><p>{params.error}</p></div></div>}
        {params.details && <div className="state-banner success"><span className="state-icon">✓</span><div className="state-copy"><strong>Identity details saved</strong><p>Your identity number was protected and checked for duplicate Worker accounts.</p></div></div>}
        {params.uploaded && <div className="state-banner success"><span className="state-icon">✓</span><div className="state-copy"><strong>Evidence added</strong><p>The file is registered to this identity check. You can add another or submit for review.</p></div></div>}
        {params.selfie && <div className="state-banner success"><span className="state-icon">✓</span><div className="state-copy"><strong>Live selfie saved</strong><p>Your selfie will be compared with your identity-document photograph during review.</p></div></div>}
        {params.removed && <div className="state-banner success"><span className="state-icon">✓</span><div className="state-copy"><strong>Evidence removed</strong><p>The private file and its active verification record have been removed.</p></div></div>}
        {params.submitted && <div className="state-banner success"><span className="state-icon">✓</span><div className="state-copy"><strong>Submitted for review</strong><p>Your evidence is now locked while SwiftTip reviews it.</p></div></div>}

        <section className="dashboard-title"><span className="eyebrow">Identity verification</span><h1>{approved ? "Your identity is verified." : "Confirm who you are."}</h1><p className="lead">SwiftTip reviews the minimum evidence needed to verify your Worker identity. Payment-provider KYC and banking verification remain separate.</p></section>

        <section className="verification-status-hero">
          <span className="eyebrow">Current status</span>
          <h2>{statusLabel(status, canSubmit, identityDetailsComplete || evidenceCount > 0)}</h2>
          <p>{approved ? "This SwiftTip identity gate is complete." : status === "additional_info_required" ? "A reviewer needs more information before a decision can be made." : ["submitted","under_review"].includes(status) ? "Your evidence is locked while the review is in progress." : canSubmit ? "All three requirements are complete. Submit them now so SwiftTip can begin the review." : "Complete your identity details, identity document and live selfie."}</p>
          <div className="evidence-count"><span>Phase 1 requirements complete</span><strong>{[identityDetailsComplete,identityEvidence.length>0,selfieComplete].filter(Boolean).length}/3</strong></div>
        </section>

        {canSubmit && access.mode === "live" && <section className="dashboard-section verification-submit-card"><span className="eyebrow">Next step</span><h2>Send your evidence for review</h2><p className="lead">Your upload is complete, but the review will not start until you submit it.</p><div className="review-lock-note"><span>i</span><div>After submission, the registered files are locked. You can change evidence only if a reviewer requests more information.</div></div><form action={submitVerification} style={{marginTop:16}}><input type="hidden" name="verificationId" value={verification!.id}/><button className="button button-primary button-large" style={{width:"100%"}} type="submit">Submit for review</button></form></section>}

        {verification?.decision_reason && <div className="state-banner warning"><span className="state-icon">i</span><div className="state-copy"><strong>Reviewer note</strong><p>{verification.decision_reason}</p></div></div>}

        {editable && access.mode === "live" && <section className="dashboard-section"><div className="section-heading"><div><span className="eyebrow">Step 1 of 3</span><h2>Identity details and consent</h2></div><span className={identityDetailsComplete ? "status-chip success" : "status-chip warning"}>{identityDetailsComplete ? "Complete" : "Required"}</span></div><p className="lead">Enter the legal details shown on your document. SwiftTip stores a protected identity fingerprint for duplicate detection—not the identity number itself.</p><form action={saveIdentityDetails} className="identity-details-form"><label className="field-label" htmlFor="legalFirstName">Legal first names<input id="legalFirstName" name="legalFirstName" defaultValue={worker.legal_first_name} autoComplete="given-name" required/></label><label className="field-label" htmlFor="legalLastName">Legal surname<input id="legalLastName" name="legalLastName" defaultValue={worker.legal_last_name} autoComplete="family-name" required/></label><label className="field-label" htmlFor="documentType">Document type<select id="documentType" name="documentType" defaultValue={claim?.document_type ?? "sa_smart_id"}><option value="sa_smart_id">South African Smart ID</option><option value="sa_green_id">South African green ID book</option><option value="passport">Passport — manual exception review</option></select></label><label className="field-label" htmlFor="identityNumber">ID or passport number<input id="identityNumber" name="identityNumber" inputMode={claim?.document_type === "passport" ? "text" : "numeric"} autoComplete="off" placeholder={claim ? `Previously saved · ends ${claim.identity_number_last4}` : "Enter the number shown on the document"} required/></label><label className="consent-check"><input type="checkbox" name="consent" value="yes" required/><span>I consent to SwiftTip processing my identity document, live selfie and related verification information to confirm that I am the identity holder and prevent duplicate or fraudulent Worker accounts.</span></label><button className="button button-secondary" type="submit">{identityDetailsComplete ? "Update identity details" : "Save identity details"}</button></form></section>}

        {canUpload && access.mode === "live" && <section className="dashboard-section"><div className="section-heading"><div><span className="eyebrow">Step 2 of 3</span><h2>Add identity document</h2></div><span className={identityEvidence.length ? "status-chip success" : "status-chip warning"}>{identityEvidence.length ? `${identityEvidence.length} saved` : "Required"}</span></div><p className="lead">Upload a clear Smart ID, green ID book or passport image/PDF. Include both sides of a Smart ID.</p><form action={uploadVerificationEvidence} className="stack-actions" style={{ marginTop: 18 }}><label className="file-drop" htmlFor="evidence"><strong>Choose an identity document</strong><p>JPG, PNG or PDF · maximum 10MB · up to 5 files</p><input id="evidence" name="evidence" type="file" accept="image/jpeg,image/png,application/pdf" required/></label><button className="button button-secondary" type="submit">Upload identity document</button></form></section>}

        {editable && access.mode === "live" && identityDetailsComplete && !selfieEvidence && <section className="dashboard-section"><div className="section-heading"><div><span className="eyebrow">Step 3 of 3</span><h2>Take a live selfie</h2></div><span className="status-chip warning">Required</span></div><p className="lead">This must be a new front-camera image. A SwiftTip reviewer will compare it with the photograph on your identity document.</p><LiveSelfieCapture/></section>}

        {access.mode === "live" && verification && evidenceCount > 0 && <section className="dashboard-section"><div className="section-heading"><div><span className="eyebrow">Private evidence</span><h2>Files in this identity check</h2></div></div><p className="lead">Venue users and customers cannot access these files.</p><div style={{marginTop:16}}>{evidence.map((item,index) => <div className="list-row" key={item.document_id}><div style={{minWidth:0}}><strong>{item.document_type === "live_selfie" ? "Live selfie" : `Identity document ${index + 1}`}</strong><div className="meta">{fileType(item.mime_type)} · {fileSize(Number(item.file_size_bytes))}</div>{!item.storage_object_available && <div className="meta" style={{marginTop:4}}>File unavailable — remove this record and upload it again.</div>}</div><div style={{display:"flex",alignItems:"center",gap:10}}><span className={item.storage_object_available ? "status-chip success" : "status-chip warning"}>{item.storage_object_available ? "Available" : "Missing"}</span>{editable && <form action={removeVerificationEvidence}><input type="hidden" name="documentId" value={item.document_id}/><button className="compact-link" type="submit">Remove</button></form>}</div></div>)}</div></section>}

        {editable && identityEvidence.length >= 5 && <div className="state-banner warning"><span className="state-icon">i</span><div className="state-copy"><strong>Five-file limit reached</strong><p>Remove an unnecessary identity document before adding another.</p></div></div>}
        {editable && evidenceCount > 0 && !allEvidenceAvailable && <div className="state-banner error"><span className="state-icon">!</span><div className="state-copy"><strong>Evidence needs attention</strong><p>A registered file is no longer available in private storage. Remove the unavailable record and upload the evidence again before submitting.</p></div></div>}

        {approved && <section className="trust-card"><span className="trust-icon">✓</span><div style={{flex:1}}><strong>Identity gate complete</strong><p>Your SwiftTip identity check is approved. Return to activation to see the remaining Venue, Settlement and terms checks.</p><Link className="action-link" href="/worker/onboarding" style={{display:"inline-block",marginTop:9}}>Continue activation →</Link></div></section>}
        <div className="nav-clearance"/>
      </div>
      <WorkerBottomNav active="profile"/>
    </main>
  );
}

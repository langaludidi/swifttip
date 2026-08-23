import Link from "next/link";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { AppMark } from "@/components/AppMark";
import { BottomNav } from "@/components/BottomNav";
import { requireWorkerSurface } from "@/lib/access";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";

type WorkerContext = {
  display_name: string;
  worker_role: string | null;
  venue_name: string | null;
  public_token: string | null;
  short_code: string | null;
  endpoint_status: string | null;
};

export default async function WorkerQrPage() {
  const access = await requireWorkerSurface();
  let context: WorkerContext = { display_name: "Thando", worker_role: "Fuel Attendant", venue_name: "Riverside Service Station", public_token: "T4K8P", short_code: "T4K8P", endpoint_status: "active" };

  if (access.mode === "live") {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.rpc("get_worker_context");
    if (data?.[0]) context = data[0] as WorkerContext;
  }

  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const proto = requestHeaders.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const tipUrl = context.public_token ? `${proto}://${host}/tip/${encodeURIComponent(context.public_token)}` : null;
  const qrDataUrl = tipUrl ? await QRCode.toDataURL(tipUrl, { width: 720, margin: 2, errorCorrectionLevel: "M" }) : null;

  return (
    <main className="mobile-app-shell">
      <div className="app-page">
        <header className="topbar"><div className="brand-lockup"><AppMark size={38}/><strong>SwiftTip</strong></div><Link className="action-link" href="/worker">Done</Link></header>
        {access.mode === "demo" && <p className="prototype-warning">Preview QR — the live QR is issued only after Worker activation.</p>}
        <section className="dashboard-title" style={{ textAlign: "center" }}><span className="eyebrow">Your QR</span><h1>Let customers tip {context.display_name}.</h1><p className="lead">{context.worker_role ?? "Worker"}{context.venue_name ? ` · ${context.venue_name}` : ""}</p></section>

        {qrDataUrl && context.endpoint_status === "active" ? (
          <section className="dashboard-section" style={{ textAlign: "center" }}>
            <div style={{ maxWidth: 320, margin: "0 auto", padding: 18, borderRadius: 28, background: "white", border: "1px solid #dce8e8" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt={`SwiftTip QR for ${context.display_name}`} style={{ width: "100%", height: "auto", display: "block" }} />
            </div>
            <p style={{ marginTop: 16, fontWeight: 800, letterSpacing: ".08em" }}>SWIFTTIP CODE: {context.short_code ?? "—"}</p>
            <p className="fee-note">The QR contains only the public SwiftTip tipping URL. It contains no banking, identity-document or Settlement information.</p>
            <div className="stack-actions" style={{ marginTop: 18 }}>
              <Link className="button button-primary button-large" href={tipUrl ?? "/worker"}>Preview customer view</Link>
              <a className="button button-secondary" href={qrDataUrl} download={`SwiftTip-${context.display_name}-QR.png`}>Download QR</a>
            </div>
          </section>
        ) : (
          <section className="dashboard-section"><div className="empty-state"><strong>Your QR is not active yet</strong><p>Complete the outstanding verification, Venue and Settlement-readiness steps first.</p><Link className="button button-primary" href="/worker/profile">Review profile</Link></div></section>
        )}
        <div className="nav-clearance"/>
      </div>
      <BottomNav active="worker"/>
    </main>
  );
}

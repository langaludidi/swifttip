import Link from "next/link";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { AppMark } from "@/components/AppMark";
import { WorkerBottomNav } from "@/components/WorkerBottomNav";
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
  const active = Boolean(qrDataUrl && context.endpoint_status === "active");

  return (
    <main className="mobile-app-shell">
      <div className="app-page worker-home-page">
        <header className="topbar"><div className="brand-lockup"><AppMark size={38}/><div><strong>SwiftTip</strong><span className="brand-subline">Worker</span></div></div><Link className="compact-link" href="/worker">Done</Link></header>
        {access.mode === "demo" && <div className="state-banner warning"><span className="state-icon">i</span><div className="state-copy"><strong>Preview QR</strong><p>The live QR is issued only after Worker activation.</p></div></div>}

        <section className="dashboard-title qr-page-title"><span className="eyebrow">Your tipping QR</span><h1>Make it easy to thank you.</h1><p className="lead">Show this screen or your printed SwiftTip QR to a customer.</p></section>

        {active ? (
          <section className="qr-id-card">
            <div className="qr-code-frame">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl!} alt={`SwiftTip QR for ${context.display_name}`} />
            </div>
            <div className="qr-code-label">Worker code</div>
            <div className="qr-short-code">{context.short_code ?? "—"}</div>
            <div className="qr-person"><strong>{context.display_name}</strong><span>·</span><span>{context.worker_role ?? "Worker"}</span>{context.venue_name && <><span>·</span><span>{context.venue_name}</span></>}</div>

            <div className="qr-safety-note"><span>✓</span><div><strong>Public tipping link only.</strong><br/>This QR does not contain your bank details, identity document or Settlement information.</div></div>

            <div className="stack-actions" style={{ marginTop: 18 }}>
              <Link className="button button-primary button-large" href={tipUrl!}>Preview what customers see</Link>
              <a className="button button-secondary" href={qrDataUrl!} download={`SwiftTip-${context.display_name}-QR.png`}>Save QR image</a>
            </div>
          </section>
        ) : (
          <section className="dashboard-section empty-state-polished"><span className="empty-icon">⌗</span><strong>Your QR is not active yet</strong><p>Finish the outstanding identity, Venue, Settlement-readiness and terms checks before customers can tip this profile.</p><Link className="button button-primary" href="/worker/onboarding">Continue activation</Link></section>
        )}
        <div className="nav-clearance"/>
      </div>
      <WorkerBottomNav active="qr"/>
    </main>
  );
}

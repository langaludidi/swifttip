import Link from "next/link";
import { redirect } from "next/navigation";
import { AppMark } from "@/components/AppMark";
import { CustomerBottomNav } from "@/components/CustomerBottomNav";
import { getServerConfig } from "@/lib/config";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";

const LIVE_SHORT_CODE_PATTERN = /^[0-9A-HJKMNP-TV-Z]{8}$/;

async function resolveWorkerCode(formData: FormData) {
  "use server";
  const code = String(formData.get("code") ?? "").trim().toUpperCase().replace(/\s+/g, "");
  const config = getServerConfig();

  if (config.demoMode) {
    if (code !== "T4K8P") redirect(`/code?error=${encodeURIComponent("Worker code not found in this preview")}`);
    redirect("/tip/T4K8P");
  }

  if (!LIVE_SHORT_CODE_PATTERN.test(code)) {
    redirect(`/code?error=${encodeURIComponent("Enter the 8-character SwiftTip worker code")}`);
  }
  if (!config.databaseConfigured) redirect("/unavailable");

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("resolve_short_code", { p_short_code: code });
  const token = typeof data === "string" ? data : null;
  if (error || !token) redirect(`/code?error=${encodeURIComponent("That SwiftTip worker code is unavailable")}`);
  redirect(`/tip/${encodeURIComponent(token)}`);
}

export default async function CodePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const config = getServerConfig();
  const demo = config.demoMode;

  return (
    <main className="mobile-app-shell">
      <div className="app-page customer-flow-page">
        <header className="topbar"><Link className="back-link" href="/" aria-label="Back">←</Link><div className="brand-lockup"><AppMark size={34}/><div><strong>SwiftTip</strong><span className="brand-subline">Worker code</span></div></div><span style={{ width: 42 }} /></header>
        <section className="tip-flow code-entry-flow">
          <span className="eyebrow">Find the worker</span>
          <h1>Enter their SwiftTip code.</h1>
          <p className="lead">The {demo ? "short" : "8-character"} code appears with the worker’s SwiftTip QR. You’ll confirm the worker and Venue before choosing a gratuity.</p>
          {error && <p className="prototype-warning" role="alert">{error}</p>}
          <form action={resolveWorkerCode} className="code-entry-card">
            <label className="field-label" htmlFor="code">SwiftTip worker code</label>
            <div className="code-input-shell"><span>ST</span><input id="code" name="code" inputMode="text" autoCapitalize="characters" autoComplete="off" placeholder={demo ? "T4K8P" : "8K4M2P7Q"} minLength={demo ? 5 : 8} maxLength={demo ? 5 : 8} pattern={demo ? "[A-Za-z0-9]{5}" : "[0-9A-HJ-KM-NP-TV-Z]{8}"} required /></div>
            <button className="button button-primary button-large" type="submit">Find worker</button>
          </form>
          <div className="privacy-inline"><span>◇</span><p>There is no public worker directory. A valid QR or worker code is required.</p></div>
          <Link className="action-link centered-action" href="/scan">Scan the QR instead</Link>
          <div className="nav-clearance" />
        </section>
      </div>
      <CustomerBottomNav active="code" />
    </main>
  );
}

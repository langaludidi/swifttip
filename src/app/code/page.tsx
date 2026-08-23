import Link from "next/link";
import { redirect } from "next/navigation";
import { AppMark } from "@/components/AppMark";
import { CustomerBottomNav } from "@/components/CustomerBottomNav";
import { getServerConfig } from "@/lib/config";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";

async function resolveWorkerCode(formData: FormData) {
  "use server";
  const code = String(formData.get("code") ?? "").trim().toUpperCase().replace(/\s+/g, "");
  if (!/^[A-Z0-9]{4,12}$/.test(code)) {
    redirect(`/code?error=${encodeURIComponent("Enter a valid SwiftTip worker code")}`);
  }

  const config = getServerConfig();
  if (config.demoMode) {
    if (code !== "T4K8P") redirect(`/code?error=${encodeURIComponent("Worker code not found in this preview")}`);
    redirect("/tip/T4K8P");
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
  return (
    <main className="mobile-app-shell">
      <div className="app-page customer-flow-page">
        <header className="topbar"><Link className="back-link" href="/" aria-label="Back">←</Link><div className="brand-lockup"><AppMark size={34}/><div><strong>SwiftTip</strong><span className="brand-subline">Worker code</span></div></div><span style={{ width: 42 }} /></header>
        <section className="tip-flow code-entry-flow">
          <span className="eyebrow">Find the worker</span>
          <h1>Enter their SwiftTip code.</h1>
          <p className="lead">The short code appears with the worker’s SwiftTip QR. You’ll confirm the worker and Venue before choosing a gratuity.</p>
          {error && <p className="prototype-warning" role="alert">{error}</p>}
          <form action={resolveWorkerCode} className="code-entry-card">
            <label className="field-label" htmlFor="code">SwiftTip worker code</label>
            <div className="code-input-shell"><span>ST</span><input id="code" name="code" inputMode="text" autoCapitalize="characters" autoComplete="off" placeholder="T4K8P" maxLength={12} required /></div>
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

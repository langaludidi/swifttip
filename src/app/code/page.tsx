import Link from "next/link";
import { redirect } from "next/navigation";

async function resolveWorkerCode(formData: FormData) {
  "use server";
  const code = String(formData.get("code") ?? "").trim().toUpperCase().replace(/\s+/g, "");
  if (!/^[A-Z0-9]{4,12}$/.test(code)) {
    redirect(`/code?error=${encodeURIComponent("Enter a valid SwiftTip worker code")}`);
  }
  redirect(`/tip/${encodeURIComponent(code)}`);
}

export default async function CodePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="flow-shell">
      <div className="flow-page">
        <header className="simple-header"><Link className="back-link" href="/">←</Link><strong>Worker code</strong><span style={{ width: 42 }} /></header>
        <section className="tip-flow">
          <span className="eyebrow">Tip a worker</span>
          <h1>Enter their SwiftTip code.</h1>
          <p className="lead">Use the short code shown on the worker's SwiftTip QR card or screen. You'll confirm the worker before any payment step.</p>
          {error && <p className="prototype-warning" role="alert">{error}</p>}
          <form action={resolveWorkerCode} className="stack-actions" style={{ marginTop: 24 }}>
            <label className="field-label" htmlFor="code">SwiftTip code</label>
            <div className="custom-field"><input id="code" name="code" inputMode="text" autoCapitalize="characters" autoComplete="off" placeholder="T4K8P" maxLength={12} required /></div>
            <button className="button button-primary button-large" type="submit">Find worker</button>
          </form>
          <p className="fee-note">SwiftTip never uses a public searchable worker directory. A valid QR or code is required.</p>
        </section>
      </div>
    </main>
  );
}

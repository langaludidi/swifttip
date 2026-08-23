import Link from "next/link";
import { AppMark } from "@/components/AppMark";
import { requestAdminOtp } from "./actions";

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  return (
    <main className="flow-shell auth-shell">
      <div className="flow-page auth-page">
        <header className="simple-header"><Link className="back-link" href="/">←</Link><strong>SwiftTip Operations</strong><span style={{ width: 42 }} /></header>
        <section className="tip-flow auth-flow">
          <div className="auth-mark"><AppMark size={62}/></div>
          <span className="eyebrow">Authorised personnel only</span>
          <h1>Sign in to Operations.</h1>
          <p className="lead">Use the email address attached to your active SwiftTip Admin membership. New Admin accounts cannot be created from this screen.</p>
          {error && <div className="state-banner error" role="alert"><span className="state-icon">!</span><div className="state-copy"><strong>Sign-in unavailable</strong><p>{error}</p></div></div>}
          <form action={requestAdminOtp} className="stack-actions auth-card">
            <label className="field-label" htmlFor="email">Admin email</label>
            <div className="identity-input-shell"><input id="email" name="email" type="email" inputMode="email" autoComplete="email" placeholder="name@company.co.za" required /></div>
            <button className="button button-primary button-large" type="submit">Send sign-in code</button>
          </form>
          <div className="privacy-inline"><span>✓</span><p>Admin access is additionally protected by role checks and MFA. A successful email code alone does not grant Operations access.</p></div>
        </section>
      </div>
    </main>
  );
}

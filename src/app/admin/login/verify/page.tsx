import Link from "next/link";
import { AppMark } from "@/components/AppMark";
import { requestAdminOtp } from "../actions";

export default async function VerifyAdminPage({ searchParams }: { searchParams: Promise<{ email?: string; error?: string; notice?: string }> }) {
  const { email = "", error, notice } = await searchParams;

  return (
    <main className="flow-shell auth-shell">
      <div className="flow-page auth-page">
        <header className="simple-header"><Link className="back-link" href="/admin/login">←</Link><strong>Verify Admin access</strong><span style={{ width: 42 }} /></header>
        <section className="tip-flow auth-flow">
          <div className="auth-mark"><AppMark size={62}/></div>
          <span className="eyebrow">Step 1 of 2</span>
          <h1>Check your email.</h1>
          <p className="lead">If <strong>{email || "this email"}</strong> is authorised for SwiftTip Operations, follow the one-time sign-in link sent to it. The response does not confirm whether an Admin account exists.</p>
          {notice && <div className="state-banner" role="status"><span className="state-icon">✓</span><div className="state-copy"><strong>Code request received</strong><p>{notice}</p></div></div>}
          {error && <div className="state-banner error" role="alert"><span className="state-icon">!</span><div className="state-copy"><strong>Sign-in link not accepted</strong><p>{error}</p></div></div>}
          <section className="dashboard-section auth-card">
            <strong>Open the newest email from Supabase Auth</strong>
            <p className="lead">Select <strong>Sign in</strong> in that email. The link is single-use and expires shortly. SwiftTip will verify the session and Admin membership before opening MFA.</p>
          </section>
          <form action={requestAdminOtp} className="stack-actions"><input type="hidden" name="email" value={email}/><button className="button button-secondary" type="submit">Request another code</button></form>
          <p className="auth-footnote">The email link establishes only the first authentication factor. Privileged Admin functions remain blocked until the required MFA assurance level is reached.</p>
        </section>
      </div>
    </main>
  );
}

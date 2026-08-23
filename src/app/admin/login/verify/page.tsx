import Link from "next/link";
import { AppMark } from "@/components/AppMark";
import { requestAdminOtp, verifyAdminOtp } from "../actions";

export default async function VerifyAdminPage({ searchParams }: { searchParams: Promise<{ email?: string; error?: string; notice?: string }> }) {
  const { email = "", error, notice } = await searchParams;

  return (
    <main className="flow-shell auth-shell">
      <div className="flow-page auth-page">
        <header className="simple-header"><Link className="back-link" href="/admin/login">←</Link><strong>Verify Admin access</strong><span style={{ width: 42 }} /></header>
        <section className="tip-flow auth-flow">
          <div className="auth-mark"><AppMark size={62}/></div>
          <span className="eyebrow">Step 1 of 2</span>
          <h1>Enter your one-time code.</h1>
          <p className="lead">If <strong>{email || "this email"}</strong> is authorised for SwiftTip Operations, use the code sent to it. The sign-in response does not confirm whether an Admin account exists.</p>
          {notice && <div className="state-banner" role="status"><span className="state-icon">✓</span><div className="state-copy"><strong>Code request received</strong><p>{notice}</p></div></div>}
          {error && <div className="state-banner error" role="alert"><span className="state-icon">!</span><div className="state-copy"><strong>Code not accepted</strong><p>{error}</p></div></div>}
          <form action={verifyAdminOtp} className="stack-actions auth-card">
            <input type="hidden" name="email" value={email}/>
            <label className="field-label" htmlFor="token">One-time code</label>
            <div className="otp-input-shell"><input id="token" name="token" inputMode="numeric" autoComplete="one-time-code" placeholder="000000" minLength={6} maxLength={8} required /></div>
            <button className="button button-primary button-large" type="submit">Verify and continue</button>
          </form>
          <form action={requestAdminOtp} className="stack-actions"><input type="hidden" name="email" value={email}/><button className="button button-secondary" type="submit">Request another code</button></form>
          <p className="auth-footnote">Email verification establishes only the first authentication factor. Privileged Admin functions remain blocked until the required MFA assurance level is reached.</p>
        </section>
      </div>
    </main>
  );
}

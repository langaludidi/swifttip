import Link from "next/link";
import { AppMark } from "@/components/AppMark";
import { requestWorkerOtp, verifyWorkerOtp } from "../actions";

export default async function VerifyWorkerPage({ searchParams }: { searchParams: Promise<{ phone?: string; error?: string; notice?: string }> }) {
  const { phone = "", error, notice } = await searchParams;
  return <main className="flow-shell customer-flow-page"><div className="flow-page"><header className="simple-header"><Link className="back-link" href="/worker/login">←</Link><div className="brand-lockup"><AppMark size={34}/><div><strong>SwiftTip</strong><span className="brand-subline">Worker</span></div></div><span style={{width:42}}/></header>
  <section className="tip-flow code-entry-flow"><span className="eyebrow">Confirm your mobile</span><h1>Enter your one-time code.</h1><p className="lead">If <strong>{phone || "this mobile number"}</strong> is eligible for Worker access, use the code sent to it. SwiftTip gives the same response whether or not an account exists.</p>
  {notice && <div className="state-banner" role="status"><span className="state-icon">✓</span><div className="state-copy"><strong>Code request received</strong><p>{notice}</p></div></div>}
  {error && <div className="state-banner error" role="alert"><span className="state-icon">!</span><div className="state-copy"><strong>Code not accepted</strong><p>{error}</p></div></div>}
  <form action={verifyWorkerOtp} className="code-entry-card"><input type="hidden" name="phone" value={phone}/><label className="field-label" htmlFor="token">6-digit code</label><div className="code-input-shell"><span>OTP</span><input id="token" name="token" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" placeholder="000000" required/></div><button className="button button-primary button-large" type="submit">Verify and continue</button></form>
  <form action={requestWorkerOtp} className="stack-actions"><input type="hidden" name="phone" value={phone}/><button className="button button-secondary" type="submit">Request another code</button></form>
  <Link className="action-link centered-action" href="/worker/login">Use a different mobile number</Link></section></div></main>;
}

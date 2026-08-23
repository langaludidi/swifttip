import Link from "next/link";
import { AppMark } from "@/components/AppMark";
import { verifyWorkerOtp } from "../actions";

export default async function VerifyWorkerPage({ searchParams }: { searchParams: Promise<{ phone?: string; error?: string }> }) {
  const { phone = "", error } = await searchParams;
  return <main className="flow-shell customer-flow-page"><div className="flow-page"><header className="simple-header"><Link className="back-link" href="/worker/login">←</Link><div className="brand-lockup"><AppMark size={34}/><div><strong>SwiftTip</strong><span className="brand-subline">Worker</span></div></div><span style={{width:42}}/></header>
  <section className="tip-flow code-entry-flow"><span className="eyebrow">Confirm your mobile</span><h1>Enter the code we sent.</h1><p className="lead">Use the one-time code sent to <strong>{phone || "your mobile"}</strong>. It confirms this sign-in only.</p>{error && <div className="state-banner error" role="alert"><span className="state-icon">!</span><div className="state-copy"><strong>That code did not work</strong><p>{error}</p></div></div>}
  <form action={verifyWorkerOtp} className="code-entry-card"><input type="hidden" name="phone" value={phone}/><label className="field-label" htmlFor="token">6-digit code</label><div className="code-input-shell"><span>OTP</span><input id="token" name="token" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" placeholder="000000" required/></div><button className="button button-primary button-large" type="submit">Verify and continue</button></form><Link className="action-link centered-action" href="/worker/login">Use a different mobile number</Link></section></div></main>;
}

import Link from "next/link";
import { verifyWorkerOtp } from "../actions";

export default async function VerifyWorkerPage({ searchParams }: { searchParams: Promise<{ phone?: string; error?: string }> }) {
  const { phone = "", error } = await searchParams;
  return <main className="flow-shell"><div className="flow-page"><header className="simple-header"><Link className="back-link" href="/worker/login">←</Link><strong>Verify mobile</strong><span style={{width:42}}/></header>
  <section className="tip-flow"><span className="eyebrow">Security check</span><h1>Enter your one-time code.</h1><p className="lead">We only establish the worker session after the auth provider verifies the OTP.</p>{error && <p className="prototype-warning" role="alert">{error}</p>}
  <form action={verifyWorkerOtp} className="stack-actions" style={{marginTop:24}}><input type="hidden" name="phone" value={phone}/><label className="field-label" htmlFor="token">6-digit code</label><div className="custom-field"><input id="token" name="token" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" required/></div><button className="button button-primary button-large" type="submit">Verify</button></form></section></div></main>;
}

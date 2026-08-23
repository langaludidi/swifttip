import Link from "next/link";
import { requestWorkerOtp } from "./actions";

export default async function WorkerLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <main className="flow-shell"><div className="flow-page"><header className="simple-header"><Link className="back-link" href="/">←</Link><strong>Worker access</strong><span style={{width:42}}/></header>
    <section className="tip-flow"><span className="eyebrow">Worker security</span><h1>Access SwiftTip with your verified mobile.</h1><p className="lead">Production uses a real one-time code. There is no universal or hard-coded OTP.</p>
    {error && <p className="prototype-warning" role="alert">{error}</p>}
    <form action={requestWorkerOtp} className="stack-actions" style={{marginTop:24}}><label className="field-label" htmlFor="phone">Mobile number</label><div className="custom-field"><input id="phone" name="phone" inputMode="tel" placeholder="082 555 0199" autoComplete="tel" required/></div><button className="button button-primary button-large" type="submit">Send secure code</button></form>
    <p className="fee-note">This becomes operational only after the new MVP v3 Supabase project and SMS/OTP provider are configured.</p></section></div></main>;
}

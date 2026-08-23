import Link from "next/link";
import { AppMark } from "@/components/AppMark";
import { requestWorkerOtp } from "./actions";

export default async function WorkerLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <main className="flow-shell customer-flow-page"><div className="flow-page"><header className="simple-header"><Link className="back-link" href="/">←</Link><div className="brand-lockup"><AppMark size={34}/><div><strong>SwiftTip</strong><span className="brand-subline">Worker</span></div></div><span style={{width:42}}/></header>
    <section className="tip-flow code-entry-flow"><span className="eyebrow">Worker sign in</span><h1>Welcome back.</h1><p className="lead">Use the mobile number linked to your SwiftTip Worker profile. We'll send a one-time code to confirm it's you.</p>
    {error && <div className="state-banner error" role="alert"><span className="state-icon">!</span><div className="state-copy"><strong>We could not send the code</strong><p>{error}</p></div></div>}
    <form action={requestWorkerOtp} className="code-entry-card"><label className="field-label" htmlFor="phone">South African mobile number</label><div className="code-input-shell"><span>SA</span><input id="phone" name="phone" inputMode="tel" placeholder="082 555 0199" autoComplete="tel" required/></div><button className="button button-primary button-large" type="submit">Send one-time code</button></form>
    <div className="privacy-inline"><span>✓</span><p>You can enter the number as 082… or +2782…. There is no universal SwiftTip login code.</p></div></section></div></main>;
}

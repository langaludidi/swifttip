import Link from "next/link";
import { AppMark } from "@/components/AppMark";
import { verifyVenueOtp } from "../actions";

export default async function VenueVerifyPage({ searchParams }: { searchParams: Promise<{ email?: string; error?: string }> }) {
  const { email = "", error } = await searchParams;
  return <main className="flow-shell customer-flow-page"><div className="flow-page"><header className="simple-header"><Link className="back-link" href="/venue/login">←</Link><div className="brand-lockup"><AppMark size={34}/><div><strong>SwiftTip</strong><span className="brand-subline">Venue</span></div></div><span style={{width:42}}/></header>
    <section className="tip-flow code-entry-flow"><span className="eyebrow">Confirm your email</span><h1>Enter the code we sent.</h1><p className="lead">Use the one-time code sent to <strong>{email || "your work email"}</strong>.</p>
    {error && <div className="state-banner error" role="alert"><span className="state-icon">!</span><div className="state-copy"><strong>That code did not work</strong><p>{error}</p></div></div>}
    <form action={verifyVenueOtp} className="code-entry-card"><input type="hidden" name="email" value={email}/><label className="field-label" htmlFor="token">One-time code</label><div className="code-input-shell"><span>OTP</span><input id="token" name="token" inputMode="numeric" autoComplete="one-time-code" placeholder="000000" minLength={6} maxLength={8} required/></div><button className="button button-primary button-large" type="submit">Verify and continue</button></form>
    <div className="privacy-inline"><span>✓</span><p>After verification, SwiftTip still checks that your user has an active Venue membership before any Venue data is shown.</p></div><Link className="action-link centered-action" href="/venue/login">Use a different email</Link></section></div></main>;
}

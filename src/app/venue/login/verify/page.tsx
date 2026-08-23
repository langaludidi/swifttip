import Link from "next/link";
import { verifyVenueOtp } from "../actions";

export default async function VenueVerifyPage({ searchParams }: { searchParams: Promise<{ email?: string; error?: string }> }) {
  const { email = "", error } = await searchParams;
  return <main className="flow-shell"><div className="flow-page"><header className="simple-header"><Link className="back-link" href="/venue/login">←</Link><strong>Verify Venue access</strong><span style={{width:42}}/></header>
    <section className="tip-flow"><span className="eyebrow">One-time code</span><h1>Check your email.</h1><p className="lead">Enter the secure code sent to <strong>{email || "your email"}</strong>.</p>
    {error && <p className="prototype-warning" role="alert">{error}</p>}
    <form action={verifyVenueOtp} className="stack-actions" style={{marginTop:24}}><input type="hidden" name="email" value={email}/><label className="field-label" htmlFor="token">Secure code</label><div className="custom-field"><input id="token" name="token" inputMode="numeric" autoComplete="one-time-code" placeholder="000000" minLength={6} maxLength={8} required/></div><button className="button button-primary button-large" type="submit">Verify and continue</button></form>
    <p className="fee-note">No Venue data is exposed until a valid invitation and membership are present.</p></section></div></main>;
}

import Link from "next/link";
import { AppMark } from "@/components/AppMark";
import { requestVenueOtp } from "./actions";

export default async function VenueLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <main className="flow-shell customer-flow-page"><div className="flow-page"><header className="simple-header"><Link className="back-link" href="/">←</Link><div className="brand-lockup"><AppMark size={34}/><div><strong>SwiftTip</strong><span className="brand-subline">Venue</span></div></div><span style={{width:42}}/></header>
    <section className="tip-flow code-entry-flow"><span className="eyebrow">Venue sign in</span><h1>Manage your SwiftTip Venue.</h1><p className="lead">Use the work email associated with your Venue invitation. Signing in alone does not grant access to Venue data.</p>
    {error && <div className="state-banner error" role="alert"><span className="state-icon">!</span><div className="state-copy"><strong>We could not send the code</strong><p>{error}</p></div></div>}
    <form action={requestVenueOtp} className="code-entry-card"><label className="field-label" htmlFor="email">Work email</label><div className="code-input-shell auth-input-shell"><span>@</span><input id="email" name="email" inputMode="email" type="email" placeholder="manager@example.co.za" autoComplete="email" required/></div><button className="button button-primary button-large" type="submit">Send one-time code</button></form>
    <div className="privacy-inline"><span>✓</span><p>Venue access remains invitation- and membership-scoped after authentication.</p></div></section></div></main>;
}

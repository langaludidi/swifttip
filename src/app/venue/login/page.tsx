import Link from "next/link";
import { requestVenueOtp } from "./actions";

export default async function VenueLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <main className="flow-shell"><div className="flow-page"><header className="simple-header"><Link className="back-link" href="/">←</Link><strong>Venue access</strong><span style={{width:42}}/></header>
    <section className="tip-flow"><span className="eyebrow">Venue security</span><h1>Sign in to your SwiftTip Venue.</h1><p className="lead">Venue access is invitation-based. Creating an Auth identity does not grant access to any Venue.</p>
    {error && <p className="prototype-warning" role="alert">{error}</p>}
    <form action={requestVenueOtp} className="stack-actions" style={{marginTop:24}}><label className="field-label" htmlFor="email">Work email</label><div className="custom-field"><input id="email" name="email" inputMode="email" type="email" placeholder="manager@example.co.za" autoComplete="email" required/></div><button className="button button-primary button-large" type="submit">Send secure code</button></form>
    <p className="fee-note">You can sign in before an invitation exists, but the Venue dashboard remains inaccessible until SwiftTip Operations creates and approves the membership.</p></section></div></main>;
}

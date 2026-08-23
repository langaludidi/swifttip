import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerConfig } from "@/lib/config";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { acceptVenueInvitation, acceptVenueTerms } from "./actions";

type Invitation = {
  membership_id: string;
  venue_id: string;
  venue_name: string;
  branch_name: string | null;
  venue_type: string;
  public_location_label: string | null;
  venue_status: string;
  venue_role: string;
  membership_status: string;
  venue_terms_version_id: string | null;
  venue_terms_version_code: string | null;
  venue_terms_published: boolean;
  venue_terms_accepted: boolean;
};

export default async function VenueOnboardingPage({ searchParams }: { searchParams: Promise<{ error?: string; terms?: string }> }) {
  const params = await searchParams;
  const config = getServerConfig();
  let invitations: Invitation[] = [];
  const demo = config.demoMode;

  if (demo) {
    invitations = [{ membership_id:"demo-membership",venue_id:"demo-venue",venue_name:"Example Service Station",branch_name:"Midrand",venue_type:"fuel_station",public_location_label:"Midrand",venue_status:"active",venue_role:"venue_admin",membership_status:"invited",venue_terms_version_id:null,venue_terms_version_code:null,venue_terms_published:false,venue_terms_accepted:false }];
  } else {
    if (!config.databaseConfigured) redirect("/unavailable");
    const supabase = await createSupabaseServerClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) redirect("/venue/login");
    const result = (await supabase.rpc("get_my_venue_invitations")) as unknown as { data: Invitation[] | null; error: { message?: string } | null };
    if (result.error) redirect(`/unavailable?reason=${encodeURIComponent("venue_onboarding")}`);
    invitations = result.data ?? [];
    if (invitations.some((item) => item.membership_status === "active")) redirect("/venue");
  }

  return <main className="flow-shell"><div className="flow-page"><header className="simple-header"><Link className="back-link" href="/">←</Link><strong>Venue onboarding</strong><span style={{width:42}}/></header>
    <section className="tip-flow"><span className="eyebrow">Invitation-based access</span><h1>Connect your Venue to SwiftTip.</h1><p className="lead">SwiftTip Operations approves the Venue. You confirm only your own membership and the applicable Venue terms.</p>
    {demo && <p className="prototype-warning">Preview only — no invitation or terms can be accepted until the live database connection is available.</p>}
    {params.error && <p className="prototype-warning" role="alert">{params.error}</p>}
    {params.terms && <p className="status-chip success" role="status" style={{display:"inline-flex"}}>Venue terms accepted</p>}

    {!invitations.length && <div className="empty-state" style={{marginTop:24}}><strong>No Venue invitation yet</strong><p>Your sign-in is valid, but it grants no Venue data by itself. SwiftTip Operations must invite this account to an approved Venue.</p></div>}

    {invitations.map((invite) => {
      const venueReady = invite.venue_status === "active";
      const termsReady = invite.venue_terms_published;
      const canAcceptMembership = venueReady && termsReady && invite.venue_terms_accepted;
      return <section className="dashboard-section" key={invite.membership_id} style={{marginTop:22}}>
        <div className="section-heading"><div><span className="eyebrow">{invite.venue_type.replaceAll("_"," ")}</span><h2 style={{marginTop:6}}>{invite.branch_name || invite.venue_name}</h2></div><span className={venueReady?"status-chip success":"status-chip warning"}>{invite.venue_status.replaceAll("_"," ")}</span></div>
        <div className="list-row"><div><strong>Venue</strong><div className="meta">{invite.venue_name}{invite.public_location_label?` · ${invite.public_location_label}`:""}</div></div></div>
        <div className="list-row"><strong>Your access role</strong><span>{invite.venue_role.replaceAll("_"," ")}</span></div>
        <div className="list-row"><strong>Venue approval</strong><span className={venueReady?"status-chip success":"status-chip warning"}>{venueReady?"Approved":"Waiting for SwiftTip"}</span></div>
        <div className="list-row"><strong>Venue terms</strong><span className={invite.venue_terms_accepted?"status-chip success":"status-chip warning"}>{!termsReady?"Not published":invite.venue_terms_accepted?"Accepted":`Review ${invite.venue_terms_version_code ?? "current version"}`}</span></div>

        {!termsReady && <p className="fee-note">No Venue terms are published yet, so SwiftTip deliberately prevents membership activation.</p>}
        {termsReady && !invite.venue_terms_accepted && !demo && <div className="stack-actions" style={{marginTop:18}}><p className="fee-note">Acceptance is versioned and permanently recorded. Review the effective document before accepting it.</p><Link className="button button-secondary" href="/legal/venue-terms" target="_blank">Read Venue terms · {invite.venue_terms_version_code}</Link><form action={acceptVenueTerms}><input type="hidden" name="membershipId" value={invite.membership_id}/><button className="button button-primary" type="submit">I have reviewed and accept these Venue terms</button></form></div>}
        {canAcceptMembership && !demo && <form action={acceptVenueInvitation} style={{marginTop:18}}><input type="hidden" name="membershipId" value={invite.membership_id}/><button className="button button-primary button-large" type="submit">Accept invitation and enter Venue</button></form>}
      </section>;
    })}
    <p className="fee-note" style={{marginTop:22}}>Venue access never includes Worker KYC documents, banking details, individual earnings rankings, payroll or Settlement controls.</p></section></div></main>;
}

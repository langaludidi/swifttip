import Link from "next/link";
import { redirect } from "next/navigation";
import { AppMark } from "@/components/AppMark";
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

  return <main className="flow-shell customer-flow-page"><div className="flow-page"><header className="simple-header"><Link className="back-link" href="/">←</Link><div className="brand-lockup"><AppMark size={34}/><div><strong>SwiftTip</strong><span className="brand-subline">Venue setup</span></div></div><span style={{width:42}}/></header>
    <section className="tip-flow"><span className="eyebrow">Invitation-based access</span><h1>Finish connecting your Venue.</h1><p className="lead">SwiftTip Operations approves the Venue. You only confirm your own access and review the applicable Venue terms.</p>
    {demo && <div className="state-banner warning"><span className="state-icon">i</span><div className="state-copy"><strong>Preview onboarding</strong><p>No invitation or legal acceptance can be completed until the staging deployment is connected to Supabase.</p></div></div>}
    {params.error && <div className="state-banner error" role="alert"><span className="state-icon">!</span><div className="state-copy"><strong>Action not completed</strong><p>{params.error}</p></div></div>}
    {params.terms && <div className="state-banner success" role="status"><span className="state-icon">✓</span><div className="state-copy"><strong>Venue terms accepted</strong><p>Your acceptance has been recorded against the applicable version.</p></div></div>}

    {!invitations.length && <div className="empty-state-polished" style={{marginTop:24}}><span className="empty-icon">⌂</span><strong>No Venue invitation yet</strong><p>Your sign-in is valid, but it grants no Venue data by itself. SwiftTip Operations must invite this account to an approved Venue.</p></div>}

    {invitations.map((invite) => {
      const venueReady = invite.venue_status === "active";
      const termsReady = invite.venue_terms_published;
      const canAcceptMembership = venueReady && termsReady && invite.venue_terms_accepted;
      return <section className="activation-action-card" key={invite.membership_id} style={{marginTop:22}}>
        <div className="section-heading"><div><span className="eyebrow">{invite.venue_type.replaceAll("_"," ")}</span><h2 style={{marginTop:6}}>{invite.branch_name || invite.venue_name}</h2></div><span className={venueReady?"status-chip success":"status-chip warning"}>{venueReady?"Venue approved":"Venue pending"}</span></div>
        <p className="lead">{invite.venue_name}{invite.public_location_label?` · ${invite.public_location_label}`:""}</p>

        <div className="activation-card" style={{marginTop:17}}>
          <div className={venueReady?"activation-row done":"activation-row"}><span className="activation-index">{venueReady?"✓":"1"}</span><div className="activation-copy"><strong>Venue approval</strong><span>SwiftTip Operations approves the participating location</span></div><span className={venueReady?"status-chip success":"status-chip warning"}>{venueReady?"Complete":"Waiting"}</span></div>
          <div className={invite.venue_terms_accepted?"activation-row done":"activation-row"}><span className="activation-index">{invite.venue_terms_accepted?"✓":"2"}</span><div className="activation-copy"><strong>Venue terms</strong><span>{termsReady?`Version ${invite.venue_terms_version_code ?? "current"}`:"No published Venue terms yet"}</span></div><span className={invite.venue_terms_accepted?"status-chip success":"status-chip warning"}>{!termsReady?"Waiting":invite.venue_terms_accepted?"Accepted":"Review"}</span></div>
          <div className="activation-row"><span className="activation-index">3</span><div className="activation-copy"><strong>Your membership</strong><span>Role: {invite.venue_role.replaceAll("_"," ")}</span></div><span className={canAcceptMembership?"status-chip success":"status-chip warning"}>{canAcceptMembership?"Ready to accept":"Invitation"}</span></div>
        </div>

        {!termsReady && <div className="state-banner warning"><span className="state-icon">i</span><div className="state-copy"><strong>No action required yet</strong><p>Membership cannot activate until an approved Venue Terms version is published.</p></div></div>}
        {termsReady && !invite.venue_terms_accepted && !demo && <div className="stack-actions" style={{marginTop:18}}><Link className="button button-secondary" href="/legal/venue-terms" target="_blank">Read Venue terms · {invite.venue_terms_version_code}</Link><form action={acceptVenueTerms}><input type="hidden" name="membershipId" value={invite.membership_id}/><button className="button button-primary" style={{width:"100%"}} type="submit">Accept Venue terms</button></form></div>}
        {canAcceptMembership && !demo && <form action={acceptVenueInvitation} style={{marginTop:18}}><input type="hidden" name="membershipId" value={invite.membership_id}/><button className="button button-primary button-large" style={{width:"100%"}} type="submit">Accept invitation and enter Venue</button></form>}
      </section>;
    })}
    <div className="privacy-inline" style={{marginTop:22}}><span>✓</span><p>Venue access excludes Worker KYC documents, banking details, individual earnings rankings, payroll and Settlement controls.</p></div></section></div></main>;
}

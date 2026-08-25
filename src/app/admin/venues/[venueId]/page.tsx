import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminRole } from "@/lib/access";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { approveVenue, inviteVenueMember, revokeVenueMembership } from "../actions";

type VenueDetail = {
  venue_id:string; legal_name:string|null; trading_name:string; branch_name:string|null; venue_type:string;
  city:string|null; province:string|null; public_location_label:string|null; venue_status:string;
  approved_at:string|null; created_at:string; active_member_count:number; invited_member_count:number;
  verified_worker_count:number; pending_worker_count:number; venue_terms_version_code:string|null; venue_terms_published:boolean;
};
type Member = { membership_id:string; member_email:string; member_display_name:string|null; venue_role:string; membership_status:string; invited_at:string; accepted_at:string|null; revoked_at:string|null; current_terms_accepted:boolean };
type WorkerLink = { association_id:string; worker_display_name:string; worker_role:string; association_status:string; worker_status:string; requested_at:string; confirmed_at:string|null; ended_at:string|null };

function human(value:string){return value.replaceAll("_"," ").replace(/^./,c=>c.toUpperCase());}
function when(value:string|null){return value?new Intl.DateTimeFormat("en-ZA",{dateStyle:"medium",timeStyle:"short",timeZone:"Africa/Johannesburg"}).format(new Date(value)):"—";}

export default async function AdminVenueDetailPage({params,searchParams}:{params:Promise<{venueId:string}>;searchParams:Promise<{error?:string;invited?:string;approved?:string;revoked?:string}>}){
  const access=await requireAdminRole(["operations_admin","super_admin"]);
  const {venueId}=await params;
  const query=await searchParams;
  let detail:VenueDetail|null=null;
  let members:Member[]=[];
  let workers:WorkerLink[]=[];

  if(access.mode==="demo"){
    detail={venue_id:venueId,legal_name:"Example Retail (Pty) Ltd",trading_name:"Example Service Station",branch_name:"Pilot Site",venue_type:"fuel_station",city:"Gqeberha",province:"Eastern Cape",public_location_label:"Gqeberha",venue_status:"active",approved_at:new Date().toISOString(),created_at:new Date().toISOString(),active_member_count:1,invited_member_count:1,verified_worker_count:2,pending_worker_count:1,venue_terms_version_code:"VENUE-2026-01",venue_terms_published:true};
    members=[{membership_id:"demo-member-active",member_email:"manager@example.co.za",member_display_name:"Venue Manager",venue_role:"venue_admin",membership_status:"active",invited_at:new Date().toISOString(),accepted_at:new Date().toISOString(),revoked_at:null,current_terms_accepted:true},{membership_id:"demo-member-invited",member_email:"supervisor@example.co.za",member_display_name:null,venue_role:"venue_viewer",membership_status:"invited",invited_at:new Date().toISOString(),accepted_at:null,revoked_at:null,current_terms_accepted:false}];
    workers=[{association_id:"demo-worker-pending",worker_display_name:"Sipho",worker_role:"Fuel Attendant",association_status:"pending",worker_status:"draft",requested_at:new Date().toISOString(),confirmed_at:null,ended_at:null},{association_id:"demo-worker-active",worker_display_name:"Nomsa",worker_role:"Cashier",association_status:"verified",worker_status:"active",requested_at:new Date().toISOString(),confirmed_at:new Date().toISOString(),ended_at:null}];
  }else{
    const supabase=await createSupabaseServerClient();
    const [detailResult,membersResult,workersResult]=await Promise.all([
      (supabase.rpc as any)("admin_get_venue_detail",{p_venue_id:venueId}),
      (supabase.rpc as any)("admin_get_venue_members",{p_venue_id:venueId}),
      (supabase.rpc as any)("admin_get_venue_worker_associations",{p_venue_id:venueId})
    ]);
    if(detailResult.error||!detailResult.data?.[0]) notFound();
    detail=detailResult.data[0] as VenueDetail;
    members=(membersResult.data??[]) as Member[];
    workers=(workersResult.data??[]) as WorkerLink[];
  }
  if(!detail) notFound();
  const active=detail.venue_status==="active";
  const readyForInvites=active&&detail.venue_terms_published;

  return <main className="dashboard-shell">
    <header className="dashboard-topbar"><div><span className="eyebrow">Venue control</span><h1>{detail.branch_name||detail.trading_name}</h1><p className="lead">{detail.trading_name}{detail.public_location_label?` · ${detail.public_location_label}`:""}</p></div><Link className="action-link" href="/admin/venues">Venue register</Link></header>
    {access.mode==="demo"&&<p className="prototype-warning">Controlled rehearsal data only. No Venue, member or Worker record is being changed.</p>}
    {query.error&&<p className="prototype-warning" role="alert">{query.error}</p>}
    {(query.invited||query.approved||query.revoked)&&<p className="status-chip success" style={{display:"inline-flex",marginBottom:16}}>Venue control updated</p>}

    <div className="metric-grid"><article className="metric-card"><span>Venue status</span><strong style={{fontSize:24}}>{human(detail.venue_status)}</strong><small>{detail.approved_at?`Approved ${when(detail.approved_at)}`:"Awaiting Operations approval"}</small></article><article className="metric-card"><span>Active users</span><strong>{Number(detail.active_member_count)}</strong><small>{Number(detail.invited_member_count)} invitations waiting</small></article><article className="metric-card"><span>Verified workers</span><strong>{Number(detail.verified_worker_count)}</strong><small>Current Venue relationships</small></article><article className="metric-card"><span>Worker requests</span><strong>{Number(detail.pending_worker_count)}</strong><small>Venue admin action required</small></article></div>

    {!detail.venue_terms_published&&<div className="state-banner warning"><span className="state-icon">!</span><div className="state-copy"><strong>Venue onboarding is legally blocked</strong><p>No effective Venue Terms version is published. Invitations may be prepared, but users cannot accept and activate them until this is resolved.</p></div></div>}
    {detail.venue_terms_published&&<div className="state-banner success"><span className="state-icon">✓</span><div className="state-copy"><strong>Venue terms available</strong><p>Current version: {detail.venue_terms_version_code}. Each Venue user must accept it before membership activation.</p></div></div>}

    <div className="admin-grid">
      <section className="dashboard-section"><span className="eyebrow">Readiness</span><h2>Participation controls</h2><div className="list-row"><strong>Venue approved</strong><span className={active?"status-chip success":"status-chip warning"}>{active?"Ready":"Required"}</span></div><div className="list-row"><strong>Venue Terms published</strong><span className={detail.venue_terms_published?"status-chip success":"status-chip warning"}>{detail.venue_terms_published?"Ready":"Required"}</span></div><div className="list-row"><strong>Active Venue administrator</strong><span className={Number(detail.active_member_count)>0?"status-chip success":"status-chip warning"}>{Number(detail.active_member_count)>0?"Present":"Required"}</span></div>{!active&&access.mode==="live"&&<form action={approveVenue} className="stack-actions" style={{marginTop:18}}><input type="hidden" name="venueId" value={detail.venue_id}/><button className="button button-primary" type="submit">Approve Venue</button></form>}</section>
      <section className="dashboard-section"><span className="eyebrow">Access</span><h2>Invite Venue user</h2><p className="lead">The person must sign in once with this email before Operations can prepare membership.</p><form action={inviteVenueMember} className="stack-actions" style={{marginTop:18}}><input type="hidden" name="venueId" value={detail.venue_id}/><label className="field-label" htmlFor="detail-email">Email</label><div className="custom-field"><input id="detail-email" name="email" type="email" autoComplete="email" required placeholder="manager@example.co.za"/></div><label className="field-label" htmlFor="detail-role">Role</label><select id="detail-role" name="role" defaultValue="venue_admin"><option value="venue_admin">Venue admin — manage Worker relationships</option><option value="venue_viewer">View only</option></select><button className="button button-primary" type="submit" disabled={access.mode!=="live"||!active}>Prepare invitation</button></form>{!readyForInvites&&<p className="fee-note">{!active?"Approve this Venue before inviting users.":"The invitation can be prepared, but activation remains blocked until Venue Terms are published."}</p>}</section>
    </div>

    <section className="dashboard-section"><div className="section-heading"><div><span className="eyebrow">Venue users</span><h2>Memberships</h2></div><span className="meta">{members.length}</span></div>{members.length?members.map(member=><div className="queue-row" key={member.membership_id}><div><strong>{member.member_display_name||member.member_email}</strong><div className="meta">{member.member_email} · {human(member.venue_role)} · invited {when(member.invited_at)}{member.accepted_at?` · accepted ${when(member.accepted_at)}`:""}</div></div><div style={{textAlign:"right"}}><span className={member.membership_status==="active"?"status-chip success":"status-chip warning"}>{human(member.membership_status)}</span><div className="meta">Terms: {member.current_terms_accepted?"accepted":"outstanding"}</div>{access.mode==="live"&&member.membership_status!=="revoked"&&<details style={{marginTop:8}}><summary className="compact-link">Revoke access</summary><form action={revokeVenueMembership} className="stack-actions" style={{marginTop:10}}><input type="hidden" name="venueId" value={detail.venue_id}/><input type="hidden" name="membershipId" value={member.membership_id}/><input name="reason" required minLength={3} maxLength={300} placeholder="Reason for revocation"/><button className="button button-secondary" type="submit">Confirm revocation</button></form></details>}</div></div>):<div className="empty-state"><strong>No Venue users</strong><p>Prepare the first administrator invitation after the Venue is approved.</p></div>}</section>

    <section className="dashboard-section"><div className="section-heading"><div><span className="eyebrow">Worker relationships</span><h2>Association register</h2></div><span className="meta">{workers.length}</span></div>{workers.length?workers.map(worker=><div className="queue-row" key={worker.association_id}><div><strong>{worker.worker_display_name}</strong><div className="meta">{worker.worker_role} · requested {when(worker.requested_at)}{worker.confirmed_at?` · confirmed ${when(worker.confirmed_at)}`:""}</div></div><div style={{textAlign:"right"}}><span className={worker.association_status==="verified"?"status-chip success":"status-chip warning"}>{human(worker.association_status)}</span><div className="meta">Worker: {human(worker.worker_status)}</div></div></div>):<div className="empty-state"><strong>No Worker relationships</strong><p>Worker requests will appear here after identity approval and Venue selection.</p></div>}<p className="fee-note">Operations can monitor this register, but only an active Venue administrator confirms whether the Worker currently works at the Venue.</p></section>
  </main>;
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerConfig } from "@/lib/config";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { markNotificationRead } from "./actions";

type Notification={notification_id:string;notification_type:string;title:string;body:string|null;action_path:string|null;read_at:string|null;created_at:string};

export default async function NotificationsPage({searchParams}:{searchParams:Promise<{error?:string}>}){
  const params=await searchParams;
  const config=getServerConfig();
  let rows:Notification[]=[];
  let preview=config.demoMode;
  if(preview){
    rows=[{notification_id:"demo",notification_type:"worker_venue_verified",title:"Venue relationship confirmed",body:"Example Service Station relationship is now verified.",action_path:"/worker/onboarding",read_at:null,created_at:new Date().toISOString()}];
  }else{
    if(!config.databaseConfigured)redirect("/unavailable");
    const supabase=await createSupabaseServerClient();
    const {data:auth}=await supabase.auth.getUser();
    if(!auth.user)redirect("/");
    const {data,error}=await supabase.rpc("get_my_notifications",{p_limit:50});
    if(error)redirect("/unavailable?reason=notifications");
    rows=(data??[]) as Notification[];
  }
  const unread=rows.filter(row=>!row.read_at).length;
  return <main className="flow-shell"><div className="flow-page"><header className="simple-header"><Link className="back-link" href="/">←</Link><strong>Notifications</strong><span className={unread?"status-chip warning":"status-chip success"}>{unread} new</span></header><section className="tip-flow"><span className="eyebrow">Operational updates</span><h1>What changed in SwiftTip.</h1><p className="lead">Only account and transaction operations appear here. Marketing messages and external SMS/email delivery are not part of this build.</p>
  {preview&&<p className="prototype-warning">Preview notification only. Live notifications are generated from canonical database state changes.</p>}{params.error&&<p className="prototype-warning" role="alert">{params.error}</p>}
  <section className="dashboard-section">{rows.length?rows.map(n=><article className="queue-row" key={n.notification_id} style={{alignItems:"start"}}><div style={{flex:1}}><div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}><strong>{n.title}</strong>{!n.read_at&&<span className="status-chip warning">New</span>}</div>{n.body&&<p className="meta" style={{marginTop:6}}>{n.body}</p>}<div className="meta" style={{marginTop:8}}>{new Date(n.created_at).toLocaleString("en-ZA")}</div><div style={{display:"flex",gap:10,marginTop:12,flexWrap:"wrap"}}>{n.action_path&&<Link className="action-link" href={n.action_path}>Open</Link>}{!n.read_at&&!preview&&<form action={markNotificationRead}><input type="hidden" name="notificationId" value={n.notification_id}/><button className="button button-secondary" type="submit">Mark read</button></form>}</div></div></article>):<div className="empty-state"><strong>No notifications yet</strong><p>Verification, Venue, support and Settlement changes will appear here when they occur.</p></div>}</section>
  <p className="fee-note">In-app notifications do not change financial truth. They are pointers to the underlying canonical records.</p></section></div></main>;
}

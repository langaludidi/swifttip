import Link from "next/link";
import { AppMark } from "@/components/AppMark";
import { WorkerBottomNav } from "@/components/WorkerBottomNav";
import { requireWorkerSurface } from "@/lib/access";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { createWorkerSupportCase } from "./actions";

type SupportCase = {
  case_reference: string;
  category: string;
  subject: string;
  case_status: string;
  severity: string;
  created_at: string;
  resolved_at: string | null;
  closed_at: string | null;
};

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en-ZA", { timeZone:"Africa/Johannesburg", dateStyle:"medium" }).format(new Date(value));
}

function statusClass(value:string){return value === "resolved" || value === "closed" ? "status-chip success" : "status-chip warning";}

export default async function WorkerSupportPage({ searchParams }: { searchParams: Promise<{ error?: string; created?: string }> }) {
  const params = await searchParams;
  const access = await requireWorkerSurface();
  let cases: SupportCase[] = access.mode === "demo" ? [{ case_reference:"ST-SUP-26-000001", category:"verification", subject:"Verification status question", case_status:"open", severity:"normal", created_at:new Date().toISOString(), resolved_at:null, closed_at:null }] : [];

  if (access.mode === "live") {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.rpc("worker_get_support_cases", { p_limit: 20 });
    cases = (data ?? []) as SupportCase[];
  }

  return <main className="mobile-app-shell"><div className="app-page worker-home-page">
    <header className="topbar"><div className="brand-lockup"><AppMark size={38}/><div><strong>SwiftTip</strong><span className="brand-subline">Worker support</span></div></div><Link className="compact-link" href="/worker">Home</Link></header>
    {access.mode === "demo" && <div className="state-banner warning"><span className="state-icon">i</span><div className="state-copy"><strong>Preview support data</strong><p>The live support workflow already exists in the MVP v3 database.</p></div></div>}
    {params.error && <div className="state-banner error" role="alert"><span className="state-icon">!</span><div className="state-copy"><strong>Case not opened</strong><p>{params.error}</p></div></div>}
    {params.created && <div className="state-banner success"><span className="state-icon">✓</span><div className="state-copy"><strong>Support case opened</strong><p>Reference {params.created}. Keep this number for follow-up.</p></div></div>}

    <section className="dashboard-title"><span className="eyebrow">Help</span><h1>What needs attention?</h1><p className="lead">Open a case when something needs SwiftTip Operations. If it relates to a specific tip, include the transaction reference.</p></section>

    <section className="dashboard-section"><div className="section-heading"><div><span className="eyebrow">New case</span><h2>Tell us what happened</h2></div></div><form action={createWorkerSupportCase} className="stack-actions" style={{marginTop:16}}>
      <label className="field-label" htmlFor="category">What is this about?</label><select id="category" name="category" required defaultValue="transaction"><option value="transaction">Transaction</option><option value="settlement">Settlement</option><option value="verification">Verification</option><option value="venue">Venue</option><option value="profile">Profile</option><option value="other">Other</option></select>
      <label className="field-label" htmlFor="tipReference">Transaction reference <span className="meta">optional</span></label><div className="custom-field"><input id="tipReference" name="tipReference" placeholder="ST-26-…"/></div>
      <label className="field-label" htmlFor="subject">Short summary</label><div className="custom-field"><input id="subject" name="subject" maxLength={160} required/></div>
      <label className="field-label" htmlFor="description">What happened?</label><textarea id="description" name="description" rows={5} maxLength={4000} required/>
      <button className="button button-primary button-large" type="submit">Open support case</button>
    </form><div className="privacy-inline"><span>i</span><p>Support can investigate and route a problem, but it cannot silently rewrite a payment, Settlement, refund or dispute record.</p></div></section>

    <section className="dashboard-section"><div className="section-heading"><div><span className="eyebrow">Your cases</span><h2>Recent support activity</h2></div></div>{cases.length ? cases.map(item => <div className="queue-row" key={item.case_reference}><div><strong>{item.subject}</strong><div className="meta">{item.case_reference} · {dateLabel(item.created_at)} · {item.category.replaceAll("_"," ")}</div></div><span className={statusClass(item.case_status)}>{item.case_status.replaceAll("_"," ")}</span></div>) : <div className="empty-state-polished"><span className="empty-icon">?</span><strong>No support cases</strong><p>If you need help later, each case you open here receives a permanent SwiftTip support reference.</p></div>}</section>

    <div className="nav-clearance"/>
  </div><WorkerBottomNav active="support"/></main>;
}

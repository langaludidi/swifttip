import Link from "next/link";
import { AppMark } from "@/components/AppMark";
import { BottomNav } from "@/components/BottomNav";
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

export default async function WorkerSupportPage({ searchParams }: { searchParams: Promise<{ error?: string; created?: string }> }) {
  const params = await searchParams;
  const access = await requireWorkerSurface();
  let cases: SupportCase[] = access.mode === "demo" ? [{ case_reference:"ST-SUP-26-000001", category:"verification", subject:"Verification status question", case_status:"open", severity:"normal", created_at:new Date().toISOString(), resolved_at:null, closed_at:null }] : [];

  if (access.mode === "live") {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.rpc("worker_get_support_cases", { p_limit: 20 });
    cases = (data ?? []) as SupportCase[];
  }

  return <main className="mobile-app-shell"><div className="app-page">
    <header className="topbar"><div className="brand-lockup"><AppMark size={38}/><strong>SwiftTip</strong></div><Link className="action-link" href="/worker/profile">Profile</Link></header>
    {access.mode === "demo" && <p className="prototype-warning">Preview data only — the live support workflow is already implemented in the MVP v3 database.</p>}
    {params.error && <p className="prototype-warning" role="alert">{params.error}</p>}
    {params.created && <p className="status-chip success" style={{display:"inline-flex",marginTop:16}}>Support case {params.created} opened</p>}

    <section className="dashboard-title"><span className="eyebrow">Worker support</span><h1>Tell us what needs attention.</h1><p className="lead">Use a transaction reference when the problem relates to a specific Tip. Support does not change financial records directly.</p></section>

    <section className="dashboard-section"><h2>Open a support case</h2><form action={createWorkerSupportCase} className="stack-actions" style={{marginTop:16}}>
      <label className="field-label" htmlFor="category">Category</label><select id="category" name="category" required defaultValue="transaction"><option value="transaction">Transaction</option><option value="settlement">Settlement</option><option value="verification">Verification</option><option value="venue">Venue</option><option value="profile">Profile</option><option value="other">Other</option></select>
      <label className="field-label" htmlFor="tipReference">Transaction reference <span className="meta">optional</span></label><div className="custom-field"><input id="tipReference" name="tipReference" placeholder="ST-26-…"/></div>
      <label className="field-label" htmlFor="subject">Subject</label><div className="custom-field"><input id="subject" name="subject" maxLength={160} required/></div>
      <label className="field-label" htmlFor="description">What happened?</label><textarea id="description" name="description" rows={5} maxLength={4000} required/>
      <button className="button button-primary" type="submit">Open support case</button>
    </form></section>

    <section className="dashboard-section"><h2>Your recent cases</h2>{cases.length ? cases.map(item => <div className="queue-row" key={item.case_reference}><div><strong>{item.case_reference}</strong><div className="meta">{item.subject} · {dateLabel(item.created_at)}</div></div><span className={item.case_status === "resolved" || item.case_status === "closed" ? "status-chip success" : "status-chip warning"}>{item.case_status.replaceAll("_"," ")}</span></div>) : <div className="empty-state"><strong>No support cases</strong><p>Anything you submit here will be given a permanent case reference.</p></div>}</section>

    <section className="trust-card"><span className="trust-icon">✓</span><div><strong>Support cannot rewrite transaction history</strong><p>Any refund, dispute, settlement or reconciliation change remains a separate controlled financial action with its own audit trail.</p></div></section>
    <div className="nav-clearance"/>
  </div><BottomNav active="profile"/></main>;
}

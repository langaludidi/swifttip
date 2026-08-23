import Link from "next/link";
import { AppMark } from "@/components/AppMark";
import { BottomNav } from "@/components/BottomNav";
import { requireWorkerSurface } from "@/lib/access";

export default async function WorkerProfilePage() {
  const access = await requireWorkerSurface();
  return (
    <main className="mobile-app-shell">
      <div className="app-page">
        <header className="topbar"><div className="brand-lockup"><AppMark size={38}/><strong>SwiftTip</strong></div><Link className="action-link" href="/worker">Home</Link></header>
        {access.mode === "demo" && <p className="prototype-warning">Preview data only — live profile data will come from the MVP v3 database.</p>}
        <section className="dashboard-title"><span className="eyebrow">Worker profile</span><h1>Thando</h1><p className="lead">Fuel Attendant · Riverside Service Station</p></section>

        <section className="dashboard-section"><h2>Public profile</h2><div className="list-row"><div><strong>Customer display</strong><div className="meta">Thando · Fuel Attendant · Riverside Service Station</div></div><span className="status-chip success">Verified</span></div><Link className="action-link" href="/tip/T4K8P">Preview customer view</Link></section>

        <section className="dashboard-section"><h2>Verification</h2>{[["Identity details","Approved"],["Venue confirmation","Approved"],["Payment verification","Ready"]].map(([label,status])=><div className="list-row" key={label}><strong>{label}</strong><span className="status-chip success">{status}</span></div>)}</section>

        <section className="dashboard-section"><h2>Settlement destination</h2><div className="list-row"><div><strong>Payment details</strong><div className="meta">FNB •••• 4821 · preview only</div></div><span className="status-chip success">Verified</span></div><p className="fee-note">Live changes require recent authentication, step-up verification, provider confirmation and an audit record. SwiftTip does not expose full banking details here.</p></section>

        <section className="dashboard-section"><h2>Commercial terms</h2><div className="money-breakdown"><div className="money-row"><span>Signup fee</span><strong>R0.00</strong></div><div className="money-row"><span>Monthly fee</span><strong>R0.00</strong></div><div className="money-row total"><span>Working success-fee hypothesis</span><strong>5%</strong></div></div><p className="fee-note">Pricing is versioned and must be accepted before activation. Historic transactions retain the terms that applied when they were created.</p></section>
        <div className="nav-clearance"/>
      </div>
      <BottomNav active="profile"/>
    </main>
  );
}

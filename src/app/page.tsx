import Link from "next/link";
import { AppMark } from "@/components/AppMark";
import { AudienceSwitcher } from "@/components/AudienceSwitcher";
import { CustomerBottomNav } from "@/components/CustomerBottomNav";

export default function HomePage() {
  return (
    <main className="mobile-app-shell">
      <div className="app-page customer-home-page">
        <header className="topbar customer-topbar">
          <div className="brand-lockup"><AppMark size={40}/><div><strong>SwiftTip</strong><span className="brand-subline">Digital gratuities, made clear</span></div></div>
          <Link className="compact-link" href="/worker/login">Sign in</Link>
        </header>

        <AudienceSwitcher active="customer" />

        <section className="welcome-block customer-welcome">
          <span className="eyebrow">Reward great service</span>
          <h1>Tip the person who helped you.</h1>
          <p>Scan a SwiftTip QR or enter a worker code. No customer account required.</p>
        </section>

        <section className="tip-worker-hero polished-hero">
          <div className="hero-orb hero-orb-a"/><div className="hero-orb hero-orb-b"/>
          <div className="hero-topline"><span className="hero-symbol">♥</span><span className="hero-kicker">TIP A WORKER</span></div>
          <h2>Who would you like to thank?</h2>
          <p>Confirm the worker, choose your amount, and see the full total before payment.</p>
          <div className="hero-actions">
            <Link className="button button-light button-large" href="/scan"><span className="button-icon" aria-hidden="true">⌗</span><span>Scan worker QR</span></Link>
            <Link className="button button-ghost-light" href="/code">Enter worker code</Link>
          </div>
          <div className="hero-trust">
            <span>✓ Verified worker profile</span>
            <span>◇ Clear total before payment</span>
          </div>
        </section>

        <section className="section-block">
          <div className="section-heading"><div><span className="eyebrow">How it works</span><h2>Three simple steps</h2></div></div>
          <div className="steps-grid polished-steps">
            <article><b>1</b><strong>Find</strong><span>Scan the QR or enter the worker code.</span></article>
            <article><b>2</b><strong>Confirm</strong><span>Check the worker name and venue.</span></article>
            <article><b>3</b><strong>Tip</strong><span>Choose the amount and review the total.</span></article>
          </div>
        </section>

        <section className="customer-trust-grid">
          <article><span className="trust-mini-icon">✓</span><div><strong>Verified recipient</strong><p>Confirm who you are tipping before you continue.</p></div></article>
          <article><span className="trust-mini-icon">R</span><div><strong>Clear pricing</strong><p>Your gratuity and SwiftTip service fee are shown separately.</p></div></article>
          <article><span className="trust-mini-icon">⌁</span><div><strong>Private receipt</strong><p>Keep a transaction receipt without creating an account.</p></div></article>
        </section>

        <p className="customer-footnote">SwiftTip records payment and worker settlement as separate states. A payment confirmation does not mean settlement has already completed.</p>
        <div className="nav-clearance"/>
      </div>
      <CustomerBottomNav active="home"/>
    </main>
  );
}

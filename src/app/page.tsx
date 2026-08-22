import Link from "next/link";
import { AppMark } from "@/components/AppMark";
import { BottomNav } from "@/components/BottomNav";

export default function HomePage() {
  return (
    <main className="mobile-app-shell">
      <div className="app-page customer-home-page">
        <header className="topbar">
          <div className="brand-lockup"><AppMark size={42}/><strong>SwiftTip</strong></div>
          <div className="topbar-actions"><button className="icon-button" aria-label="Notifications">●</button><Link className="avatar" href="/worker">ST</Link></div>
        </header>

        <section className="welcome-block">
          <span className="eyebrow">Reward great service</span>
          <h1>Tip a worker in seconds.</h1>
          <p>Scan their SwiftTip QR or enter their code. No customer account required.</p>
        </section>

        <section className="tip-worker-hero">
          <div className="hero-orb hero-orb-a"/><div className="hero-orb hero-orb-b"/>
          <div className="hero-symbol">♥</div>
          <span className="hero-kicker">TIP A WORKER</span>
          <h2>Who would you like to thank?</h2>
          <p>Confirm the worker before you pay.</p>
          <div className="hero-actions">
            <Link className="button button-light button-large" href="/tip/T4K8P">⌗ <span>Scan worker QR</span></Link>
            <Link className="button button-ghost-light" href="/tip/T4K8P">Enter worker code</Link>
          </div>
          <div className="hero-trust"><span>✓ Verified workers</span><span>◇ Transparent fees</span></div>
        </section>

        <section className="section-block">
          <div className="section-heading"><div><span className="eyebrow">How it works</span><h2>Simple by design</h2></div></div>
          <div className="steps-grid">
            <article><b>1</b><strong>Find</strong><span>Scan QR or enter code</span></article>
            <article><b>2</b><strong>Confirm</strong><span>Check the worker</span></article>
            <article><b>3</b><strong>Tip</strong><span>Choose amount & pay</span></article>
          </div>
        </section>

        <section className="trust-card"><span className="trust-icon">◇</span><div><strong>Secure. Clear. Direct.</strong><p>SwiftTip shows your tip and service fee before payment.</p></div></section>
        <div className="nav-clearance"/>
      </div>
      <BottomNav active="home"/>
    </main>
  );
}

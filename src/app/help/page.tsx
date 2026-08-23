import Link from "next/link";
import { AppMark } from "@/components/AppMark";

export default function HelpPage() {
  return (
    <main className="flow-shell">
      <div className="flow-page">
        <header className="simple-header"><Link className="back-link" href="/" aria-label="Back">←</Link><div className="brand-lockup"><AppMark size={34}/><strong>SwiftTip</strong></div><span /></header>
        <section className="tip-flow">
          <span className="eyebrow">Customer help</span>
          <h1>Need help with a tip?</h1>
          <p className="lead">Keep your SwiftTip reference or private receipt link. It helps us trace the exact payment record without creating a customer account.</p>
        </section>

        <section className="dashboard-section">
          <h2>Common questions</h2>
          <div className="list-row"><div><strong>Payment still processing</strong><div className="meta">A browser success screen is not treated as final payment evidence. SwiftTip waits for the canonical payment record.</div></div></div>
          <div className="list-row"><div><strong>Paid the wrong worker</strong><div className="meta">Keep the transaction reference and do not make a second payment until the first status is clear.</div></div></div>
          <div className="list-row"><div><strong>Possible duplicate payment</strong><div className="meta">SwiftTip preserves provider evidence and can distinguish the operative payment from an additional successful attempt.</div></div></div>
          <div className="list-row"><div><strong>Need your receipt</strong><div className="meta">Use the private receipt link issued with the transaction. No customer account is required.</div></div></div>
        </section>

        <section className="trust-card"><span className="trust-icon">i</span><div><strong>Pre-live environment</strong><p>Customer support channels will be published before live payments are enabled. No real-money support request is required while payments remain disabled.</p></div></section>
      </div>
    </main>
  );
}

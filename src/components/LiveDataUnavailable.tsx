"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { AppMark } from "@/components/AppMark";
import { WorkerBottomNav } from "@/components/WorkerBottomNav";

export function LiveDataUnavailable({ surface, qr = false }: { surface: "worker" | "venue"; qr?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const worker = surface === "worker";

  return (
    <main className={worker ? "mobile-app-shell" : "dashboard-shell venue-dashboard-shell"}>
      <div className={worker ? "app-page worker-home-page" : undefined}>
        <header className="topbar">
          <div className="brand-lockup"><AppMark size={38}/><div><strong>SwiftTip</strong><span className="brand-subline">{worker ? "Worker" : "Venue"}</span></div></div>
        </header>
        <section className="dashboard-section empty-state-polished" aria-live="polite" aria-busy={pending}>
          <span className="empty-icon" aria-hidden="true">!</span>
          <h1>{qr ? "Your QR is temporarily unavailable" : "Your dashboard is temporarily unavailable"}</h1>
          <p>{qr ? "We couldn't load your worker QR. Try again before sharing it with a customer." : "We couldn't load your latest information. Try again to see your current activity."}</p>
          <div className="stack-actions">
            <button className="button button-primary" disabled={pending} onClick={() => startTransition(() => router.refresh())}>{pending ? "Trying again…" : "Try again"}</button>
            <Link className="button button-secondary" href={worker ? "/worker/support" : "/help"}>Get help</Link>
          </div>
        </section>
        {worker && <div className="nav-clearance"/>}
      </div>
      {worker && <WorkerBottomNav active={qr ? "qr" : "home"}/>}
    </main>
  );
}

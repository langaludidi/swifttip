import Link from "next/link";

export function WorkerBottomNav({ active = "home" }: { active?: "home" | "tips" | "qr" | "support" | "profile" }) {
  return (
    <nav className="bottom-nav worker-bottom-nav" aria-label="Worker navigation">
      <Link className={active === "home" ? "nav-item active" : "nav-item"} href="/worker"><span aria-hidden="true">⌂</span><small>Home</small></Link>
      <Link className={active === "tips" ? "nav-item active" : "nav-item"} href="/worker/transactions"><span aria-hidden="true">R</span><small>Tips</small></Link>
      <Link className="nav-customer worker-qr-action" href="/worker/qr" aria-label="Show my tipping QR"><span aria-hidden="true">⌗</span><small>My QR</small></Link>
      <Link className={active === "support" ? "nav-item active" : "nav-item"} href="/worker/support"><span aria-hidden="true">?</span><small>Support</small></Link>
      <Link className={active === "profile" ? "nav-item active" : "nav-item"} href="/worker/profile"><span aria-hidden="true">○</span><small>Profile</small></Link>
    </nav>
  );
}

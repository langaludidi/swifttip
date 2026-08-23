import Link from "next/link";

export function BottomNav({ active }: { active: "home" | "worker" | "venue" | "customer" | "profile" }) {
  return (
    <nav className="bottom-nav" aria-label="Primary">
      <Link className={active === "home" ? "nav-item active" : "nav-item"} href="/"><span>⌂</span><small>Home</small></Link>
      <Link className={active === "worker" ? "nav-item active" : "nav-item"} href="/worker"><span>♙</span><small>Worker</small></Link>
      <Link className="nav-customer" href="/scan" aria-label="Customer — tip a worker"><span>♥</span><small>Customer</small></Link>
      <Link className={active === "venue" ? "nav-item active" : "nav-item"} href="/venue"><span>▣</span><small>Venue</small></Link>
      <Link className={active === "profile" ? "nav-item active" : "nav-item"} href="/worker/profile"><span>○</span><small>Profile</small></Link>
    </nav>
  );
}

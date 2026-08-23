import Link from "next/link";

export function CustomerBottomNav({ active = "home" }: { active?: "home" | "scan" | "tip" | "code" | "help" }) {
  return (
    <nav className="bottom-nav customer-bottom-nav" aria-label="Customer navigation">
      <Link className={active === "home" ? "nav-item active" : "nav-item"} href="/"><span aria-hidden="true">⌂</span><small>Home</small></Link>
      <Link className={active === "scan" ? "nav-item active" : "nav-item"} href="/scan"><span aria-hidden="true">⌗</span><small>Scan</small></Link>
      <Link className={active === "tip" ? "nav-customer" : "nav-customer"} href="/scan" aria-label="Tip a worker"><span aria-hidden="true">♥</span><small>Tip</small></Link>
      <Link className={active === "code" ? "nav-item active" : "nav-item"} href="/code"><span aria-hidden="true">#</span><small>Code</small></Link>
      <Link className={active === "help" ? "nav-item active" : "nav-item"} href="/help"><span aria-hidden="true">?</span><small>Help</small></Link>
    </nav>
  );
}

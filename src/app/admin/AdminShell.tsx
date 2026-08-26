"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AppMark } from "@/components/AppMark";
import { signOutAdmin } from "@/app/auth/actions";

type NavItem = { href: string; label: string; icon: string };
const navigation: { label: string; items: NavItem[] }[] = [
  { label: "Workspace", items: [
    { href: "/admin", label: "Overview", icon: "home" }, { href: "/admin/verifications", label: "Worker verification", icon: "verify" },
    { href: "/admin/venues", label: "Venues", icon: "venue" }, { href: "/admin/support", label: "Support", icon: "support" },
  ]},
  { label: "Money operations", items: [
    { href: "/admin/transactions", label: "Transactions", icon: "transaction" }, { href: "/admin/settlements", label: "Settlements", icon: "settlement" },
    { href: "/admin/refunds", label: "Refunds", icon: "refund" }, { href: "/admin/disputes", label: "Disputes", icon: "dispute" },
  ]},
  { label: "Governance", items: [
    { href: "/admin/pricing", label: "Pricing", icon: "pricing" }, { href: "/admin/legal", label: "Legal register", icon: "legal" },
    { href: "/admin/readiness", label: "Readiness", icon: "readiness" }, { href: "/admin/pilot", label: "Pilot", icon: "pilot" },
    { href: "/admin/audit", label: "Audit trail", icon: "audit" },
  ]},
];

function NavIcon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    home: <><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10M9 20v-6h6v6"/></>,
    verify: <><path d="M12 3 5 6v5c0 4.6 2.9 8.1 7 10 4.1-1.9 7-5.4 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-4"/></>,
    venue: <><path d="M4 21h16M6 21V8l6-4 6 4v13"/><path d="M9 12h2M13 12h2M9 16h2M13 16h2"/></>,
    support: <><circle cx="12" cy="12" r="9"/><path d="M9.6 9a2.5 2.5 0 0 1 4.8 1c0 2-2.4 2.1-2.4 4M12 17h.01"/></>,
    transaction: <><path d="M4 7h14M15 4l3 3-3 3M20 17H6M9 14l-3 3 3 3"/></>,
    settlement: <><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h4"/></>,
    refund: <><path d="M9 7H5V3M5.5 7.5A8 8 0 1 1 4 16"/><path d="M12 8v8M9.5 10.5c0-1.2 1-2 2.5-2s2.5.8 2.5 2-1 1.8-2.5 2-2.5.8-2.5 2 1 2 2.5 2 2.5-.8 2.5-2"/></>,
    dispute: <><path d="M12 3 2.8 20h18.4L12 3Z"/><path d="M12 9v5M12 17h.01"/></>,
    pricing: <><path d="M20 13 13 20 4 11V4h7l9 9Z"/><circle cx="8.5" cy="8.5" r="1"/></>,
    legal: <><path d="M12 3v18M5 6h14M6.5 6 3 13h7L6.5 6ZM17.5 6 14 13h7l-3.5-7ZM8 21h8"/></>,
    readiness: <><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/></>,
    pilot: <><path d="M5 21V4M5 5h12l-2 4 2 4H5"/></>,
    audit: <><path d="M5 3h14v18H5zM8 8h8M8 12h8M8 16h5"/></>,
  };
  return <svg aria-hidden="true" className="admin-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function isActive(pathname: string, href: string) { return href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`); }

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const authScreen = pathname.startsWith("/admin/login") || pathname.startsWith("/admin/mfa");
  useEffect(() => setOpen(false), [pathname]);
  if (authScreen) return children;
  const current = navigation.flatMap((group) => group.items).find((item) => isActive(pathname, item.href));
  return <div className="admin-app-shell">
    <button className={open ? "admin-sidebar-backdrop visible" : "admin-sidebar-backdrop"} aria-label="Close navigation" onClick={() => setOpen(false)} />
    <aside className={open ? "admin-sidebar open" : "admin-sidebar"}>
      <div className="admin-sidebar-brand"><AppMark size={38}/><div><strong>SwiftTip</strong><span>Operations</span></div><button className="admin-sidebar-close" onClick={() => setOpen(false)} aria-label="Close navigation">×</button></div>
      <nav className="admin-sidebar-nav" aria-label="Admin navigation">{navigation.map((group) => <div className="admin-nav-group" key={group.label}><span className="admin-nav-label">{group.label}</span>{group.items.map((item) => <Link className={isActive(pathname, item.href) ? "admin-nav-link active" : "admin-nav-link"} href={item.href} key={item.href}><NavIcon name={item.icon}/><span>{item.label}</span></Link>)}</div>)}</nav>
      <div className="admin-sidebar-footer"><div className="admin-profile"><span className="admin-profile-avatar">LL</span><div><strong>SwiftTip Admin</strong><span>Secure Operations session</span></div></div><form action={signOutAdmin}><button className="admin-signout" type="submit"><span>↪</span> Sign out</button></form></div>
    </aside>
    <div className="admin-workspace"><header className="admin-mobile-header"><button className="admin-menu-button" onClick={() => setOpen(true)} aria-label="Open navigation"><span/><span/><span/></button><strong>{current?.label ?? "Operations"}</strong><AppMark size={32}/></header><div className="admin-workspace-content">{children}</div></div>
  </div>;
}

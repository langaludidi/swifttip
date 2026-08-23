import Link from "next/link";

export function AudienceSwitcher({ active = "customer" }: { active?: "customer" | "worker" | "venue" }) {
  const items = [
    { key: "customer", label: "Customer", href: "/" },
    { key: "worker", label: "Worker", href: "/worker" },
    { key: "venue", label: "Venue", href: "/venue" }
  ] as const;

  return (
    <nav className="audience-switcher" aria-label="Choose SwiftTip experience">
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          className={active === item.key ? "audience-pill active" : "audience-pill"}
          aria-current={active === item.key ? "page" : undefined}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

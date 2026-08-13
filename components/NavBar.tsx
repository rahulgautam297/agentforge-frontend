"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/agents", label: "Agents" },
  { href: "/knowledge", label: "Knowledge" },
  { href: "/tools", label: "Tools" },
  { href: "/models", label: "Models" },
  { href: "/evaluations", label: "Evaluations" },
  { href: "/approvals", label: "Approvals" },
  { href: "/settings", label: "Settings" },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-[var(--border)] bg-[var(--surface)]">
      <div className="mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto px-4 py-3">
        <span className="mr-4 shrink-0 font-semibold tracking-tight text-[var(--foreground)]">
          AgentForge
        </span>
        {LINKS.map((link) => {
          const active =
            pathname === link.href || pathname?.startsWith(link.href + "/");
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`shrink-0 rounded-md px-3 py-1.5 text-sm no-underline transition-colors ${
                active
                  ? "bg-[var(--accent-muted)] text-white"
                  : "text-[var(--muted)] hover:bg-white/5 hover:text-[var(--foreground)]"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

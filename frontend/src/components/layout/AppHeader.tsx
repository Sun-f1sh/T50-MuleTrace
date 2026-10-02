"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { cn } from "@/lib/utils/cn";

const NAV = [
  { href: "/dashboard", label: "Overview" },
  { href: "/alerts", label: "Alerts" },
  { href: "/investigations", label: "Investigations" },
  { href: "/audit", label: "Audit" },
  { href: "/datasets", label: "Datasets" },
  { href: "/intelligence", label: "Cross-source" },
  { href: "/models", label: "Models" },
  { href: "/admin", label: "Admin" },
];

export function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-8 px-6 lg:px-10">
        <Logo href="/" />
        <nav className="flex items-center gap-1 overflow-x-auto">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors",
                  active ? "text-ink" : "text-muted hover:text-ink",
                )}
              >
                {item.label}
                {active && (
                  <span className="absolute inset-x-3.5 -bottom-[13px] h-[2px] rounded-full bg-mint" />
                )}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden font-mono text-[11px] uppercase tracking-[0.16em] text-faint md:block">
            Analyst session
          </span>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

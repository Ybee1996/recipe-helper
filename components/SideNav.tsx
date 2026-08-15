"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingListTrigger } from "@/components/ShoppingListOverlay";
import { NAV_TABS, isNavActive } from "@/lib/nav";

export function SideNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="relative z-[36] hidden lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-60 lg:shrink-0 lg:flex-col lg:border-r lg:border-[var(--line)] lg:px-4 lg:py-6"
    >
      <Link
        href="/"
        className="rounded-xl px-3 text-3xl font-medium tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        style={{ fontFamily: "var(--font-display), Georgia, serif" }}
      >
        Recipe Box
      </Link>

      <ul className="mt-8 space-y-1">
        {NAV_TABS.map((tab) => {
          const active = isNavActive(pathname, tab.href);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`block rounded-xl px-3 py-2.5 text-sm font-semibold tracking-wide outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                  active
                    ? "bg-[var(--chip)] text-[var(--accent)]"
                    : "text-[var(--muted)] lg:hover:bg-[var(--chip)]/60 lg:hover:text-[var(--ink)]"
                }`}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
        <li>
          <ShoppingListTrigger variant="row" />
        </li>
      </ul>

      <button
        type="button"
        onClick={async () => {
          await fetch("/api/auth/logout", { method: "POST" });
          window.location.assign("/login");
        }}
        className="mt-auto rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-[var(--muted)] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent)] lg:hover:bg-[var(--chip)]/60 lg:hover:text-[var(--ink)]"
      >
        Sign out
      </button>
    </nav>
  );
}

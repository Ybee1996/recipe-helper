"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_TABS, isNavActive } from "@/lib/nav";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--line)] bg-[var(--paper)]/95 backdrop-blur-md lg:hidden">
      <div className="mx-auto flex max-w-lg">
        {NAV_TABS.map((tab) => {
          const active = isNavActive(pathname, tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-1 items-center justify-center py-3.5 text-sm font-semibold tracking-wide ${
                active ? "text-[var(--accent)]" : "text-[var(--muted)]"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

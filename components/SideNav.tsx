"use client";

import { useState } from "react";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingListTrigger } from "@/components/ShoppingListOverlay";
import { NAV_TABS, isNavActive } from "@/lib/nav";

function NavTabLabel({
  label,
  active,
}: {
  label: string;
  active: boolean;
}) {
  const { pending } = useLinkStatus();
  const on = active || pending;
  return (
    <span
      className={`block rounded-xl px-3 py-2.5 ${
        on
          ? "bg-[var(--chip)] text-[var(--accent)]"
          : "text-[var(--muted)] lg:hover:bg-[var(--chip)]/60 lg:hover:text-[var(--ink)]"
      }`}
    >
      {label}
    </span>
  );
}

export function SideNav() {
  const pathname = usePathname();
  const [signingOut, setSigningOut] = useState(false);

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
                className="block rounded-xl text-sm font-semibold tracking-wide outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              >
                <NavTabLabel label={tab.label} active={active} />
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
        disabled={signingOut}
        onClick={async () => {
          if (signingOut) return;
          setSigningOut(true);
          try {
            await fetch("/api/auth/logout", { method: "POST" });
          } finally {
            window.location.assign("/login");
          }
        }}
        className="mt-auto rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-[var(--muted)] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-60 lg:hover:bg-[var(--chip)]/60 lg:hover:text-[var(--ink)]"
      >
        {signingOut ? "Signing out…" : "Sign out"}
      </button>
    </nav>
  );
}

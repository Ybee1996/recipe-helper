"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { CalendarTrigger } from "@/components/CalendarOverlay";
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
  return (
    <span
      className={
        active || pending ? "text-[var(--accent)]" : "text-[var(--muted)]"
      }
    >
      {label}
    </span>
  );
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-[36] border-t border-[var(--line)] bg-[var(--paper)]/95 backdrop-blur-md lg:hidden">
      <div className="mx-auto flex max-w-lg pr-[max(1.25rem,env(safe-area-inset-right))]">
        {NAV_TABS.map((tab) => {
          const active = isNavActive(pathname, tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-1 items-center justify-center py-3.5 text-sm font-semibold tracking-wide"
            >
              <NavTabLabel label={tab.label} active={active} />
            </Link>
          );
        })}
        <CalendarTrigger className="flex w-14 shrink-0 items-center justify-center rounded-xl" />
        <ShoppingListTrigger className="flex w-14 shrink-0 items-center justify-center rounded-xl" />
      </div>
    </nav>
  );
}

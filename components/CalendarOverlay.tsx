"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { CalendarIcon } from "@/components/CalendarIcon";
import {
  CalendarPanel,
  CALENDAR_TITLE_ID,
} from "@/components/CalendarPanel";
import { useCalendar } from "@/components/CalendarProvider";
import { useShoppingList } from "@/components/ShoppingListProvider";
import { upcomingCount, todayDate } from "@/lib/calendar";
import { useSheetDismiss } from "@/lib/sheet-dismiss";

export const CALENDAR_DIALOG_ID = "cook-calendar-dialog";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusables(root: HTMLElement) {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (el) =>
      !el.hasAttribute("disabled") &&
      el.tabIndex !== -1 &&
      el.getClientRects().length > 0,
  );
}

export function CalendarTrigger({
  variant = "icon",
  className = "",
  iconSize = 20,
}: {
  variant?: "icon" | "row";
  className?: string;
  iconSize?: number;
}) {
  const { calendarOpen, toggleCalendar, entries } = useCalendar();
  const { listOpen, closeList } = useShoppingList();
  const count = upcomingCount(entries, todayDate());
  const badge = count > 99 ? "99+" : count;

  function onToggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!calendarOpen && listOpen) closeList();
    toggleCalendar();
  }

  if (variant === "row") {
    return (
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={calendarOpen ? "true" : "false"}
        aria-controls={CALENDAR_DIALOG_ID}
        aria-haspopup="dialog"
        className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold tracking-wide outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--plan)] ${
          calendarOpen
            ? "bg-[var(--chip)] text-[var(--plan)]"
            : "text-[var(--muted)] lg:hover:bg-[var(--chip)]/60 lg:hover:text-[var(--ink)]"
        } ${className}`}
      >
        <CalendarIcon size={17} />
        Calendar
        {count > 0 ? (
          <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-[var(--plan)] px-1 text-[0.66rem] font-bold leading-none text-white">
            {badge}
          </span>
        ) : null}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={calendarOpen ? "true" : "false"}
      aria-controls={CALENDAR_DIALOG_ID}
      aria-haspopup="dialog"
      aria-label={
        count === 0
          ? "Calendar"
          : `Calendar, ${count} upcoming meal${count === 1 ? "" : "s"}`
      }
      className={`relative z-10 outline-none focus-visible:ring-2 focus-visible:ring-[var(--plan)] ${
        calendarOpen ? "text-[var(--plan)]" : "text-[var(--muted)]"
      } ${className}`}
    >
      <CalendarIcon
        size={iconSize}
        count={count > 0 ? badge : undefined}
      />
    </button>
  );
}

const KEYBOARD_MIN_PX = 90;

export function CalendarOverlay() {
  const { calendarOpen, closeCalendar } = useCalendar();
  const pathname = usePathname();
  const prevPathname = useRef(pathname);
  const [mounted, setMounted] = useState(false);
  const [keyboard, setKeyboard] = useState<{ inset: number; height: number } | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const sheetActive = mounted && calendarOpen;
  const { dragY, dragging, onPointerDown, onPointerMove, onPointerUp, onPointerCancel } =
    useSheetDismiss(dialogRef, sheetActive, closeCalendar);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (prevPathname.current === pathname) return;
    prevPathname.current = pathname;
    closeCalendar();
  }, [pathname, closeCalendar]);

  useEffect(() => {
    if (!calendarOpen) setKeyboard(null);
  }, [calendarOpen]);

  useEffect(() => {
    if (!calendarOpen) return;
    const vv = window.visualViewport;
    if (!vv) return;

    const measure = () => {
      if (window.matchMedia("(min-width: 1024px)").matches) {
        setKeyboard(null);
        return;
      }
      const inset = Math.round(window.innerHeight - vv.height - vv.offsetTop);
      if (inset < KEYBOARD_MIN_PX) {
        setKeyboard(null);
        return;
      }
      setKeyboard({ inset, height: Math.round(vv.height) });
      if (window.scrollY !== 0) window.scrollTo(0, 0);
      if (dialogRef.current) dialogRef.current.scrollTop = 0;
    };

    measure();
    vv.addEventListener("resize", measure);
    vv.addEventListener("scroll", measure);
    return () => {
      vv.removeEventListener("resize", measure);
      vv.removeEventListener("scroll", measure);
    };
  }, [calendarOpen]);

  useEffect(() => {
    if (!calendarOpen) return;
    previousFocus.current = document.activeElement as HTMLElement | null;
    const html = document.documentElement;
    const body = document.body;
    const scrollY = window.scrollY;
    const prevHtmlOverflow = html.style.overflow;
    const prevHtmlOverscroll = html.style.overscrollBehavior;
    const prevBody = body.style.cssText;
    html.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";

    const frame = window.requestAnimationFrame(() => {
      const coarse = window.matchMedia("(pointer: coarse)").matches;
      if (coarse) {
        dialogRef.current?.focus({ preventScroll: true });
      } else {
        document.getElementById(CALENDAR_TITLE_ID)?.focus({ preventScroll: true });
      }
    });

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        closeCalendar();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const items = focusables(dialogRef.current);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !dialogRef.current.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !dialogRef.current.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      html.style.overflow = prevHtmlOverflow;
      html.style.overscrollBehavior = prevHtmlOverscroll;
      body.style.cssText = prevBody;
      window.scrollTo(0, scrollY);
      previousFocus.current?.focus?.({ preventScroll: true });
    };
  }, [calendarOpen, closeCalendar]);

  if (!mounted || !calendarOpen) return null;

  return createPortal(
    <>
      <div
        className="fixed inset-x-0 top-0 bottom-14 z-[35] bg-[var(--ink)]/40 lg:inset-y-0 lg:left-60 lg:right-0"
        aria-hidden="true"
        onClick={closeCalendar}
        style={{
          ...(keyboard ? { bottom: keyboard.inset } : null),
          ...(dragging ? { opacity: Math.max(0.15, 1 - dragY / 280) } : null),
        }}
      />
      <div
        ref={dialogRef}
        id={CALENDAR_DIALOG_ID}
        role="dialog"
        aria-modal="true"
        aria-labelledby={CALENDAR_TITLE_ID}
        tabIndex={-1}
        data-sheet-dragging={dragging ? "" : undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onScroll={(e) => {
          e.currentTarget.scrollTop = 0;
        }}
        className="fixed z-[35] flex flex-col overflow-hidden bg-[var(--card)] shadow-lg overscroll-none outline-none max-lg:inset-x-0 max-lg:bottom-14 max-lg:h-[calc(100svh-3.5rem)] max-lg:rounded-t-3xl max-lg:border-t max-lg:border-[var(--line)] lg:top-0 lg:right-0 lg:bottom-0 lg:w-[28rem] lg:border-l lg:border-[var(--line)]"
        style={{
          ...(keyboard ? { bottom: keyboard.inset, height: keyboard.height } : null),
          ...(dragY ? { transform: `translateY(${dragY}px)` } : null),
          transition: dragging ? "none" : "height 180ms, bottom 180ms, transform 180ms",
        }}
      >
        <div
          data-sheet-handle
          role="button"
          tabIndex={0}
          aria-label="Close calendar"
          className="flex h-11 w-full shrink-0 touch-none items-center justify-center lg:hidden"
          style={{ touchAction: "none" }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              closeCalendar();
            }
          }}
        >
          <span className="h-1 w-10 rounded-full bg-[var(--line)]" />
        </div>
        <CalendarPanel onNavigate={closeCalendar} />
      </div>
    </>,
    document.body,
  );
}

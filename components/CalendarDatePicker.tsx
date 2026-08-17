"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useCalendar } from "@/components/CalendarProvider";
import {
  addMonths,
  formatMonthTitle,
  monthGrid,
  parseCalendarDate,
  todayDate,
  weekdayLabels,
} from "@/lib/calendar";

export function CalendarDatePicker({
  open,
  recipeId,
  recipeTitle,
  imageUrl,
  onClose,
}: {
  open: boolean;
  recipeId: string;
  recipeTitle: string;
  imageUrl?: string | null;
  onClose: () => void;
}) {
  const { entries, addToCalendar, removeEntry, removeUpcomingByRecipe } = useCalendar();
  const [mounted, setMounted] = useState(false);
  const [anchor, setAnchor] = useState(() => new Date());
  const today = todayDate();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setAnchor(new Date());
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const dates = useMemo(
    () =>
      new Set(
        entries
          .filter((entry) => entry.recipeId === recipeId)
          .map((entry) => entry.cookDate),
      ),
    [entries, recipeId],
  );
  const entryByDate = useMemo(() => {
    const map = new Map<string, string>();
    for (const entry of entries) {
      if (entry.recipeId === recipeId) map.set(entry.cookDate, entry.id);
    }
    return map;
  }, [entries, recipeId]);

  const cells = useMemo(
    () => monthGrid(anchor.getFullYear(), anchor.getMonth()),
    [anchor],
  );

  function toggleDate(date: string) {
    const existing = entryByDate.get(date);
    if (existing) {
      removeEntry(existing);
      return;
    }
    addToCalendar({
      recipeId,
      cookDate: date,
      title: recipeTitle,
      imageUrl,
    });
  }

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--ink)]/40 p-4 sm:items-center"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendar-date-picker-title"
        className="w-full max-w-sm rounded-2xl border border-[var(--line)] bg-[var(--card)] p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          id="calendar-date-picker-title"
          className="text-lg font-semibold"
          style={{ fontFamily: "var(--font-display), Georgia, serif" }}
        >
          Cook {recipeTitle}
        </h3>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Tap a day to add or remove it.
        </p>

        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setAnchor((current) => addMonths(current, -1))}
            aria-label="Previous month"
            className="grid h-9 w-9 place-items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[var(--plan)] lg:hover:bg-[var(--chip)]"
          >
            <span aria-hidden="true">‹</span>
          </button>
          <p className="text-sm font-semibold">
            {formatMonthTitle(anchor.getFullYear(), anchor.getMonth())}
          </p>
          <button
            type="button"
            onClick={() => setAnchor((current) => addMonths(current, 1))}
            aria-label="Next month"
            className="grid h-9 w-9 place-items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[var(--plan)] lg:hover:bg-[var(--chip)]"
          >
            <span aria-hidden="true">›</span>
          </button>
        </div>

        <div className="mt-2 grid grid-cols-7 gap-1 text-center text-[0.7rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
          {weekdayLabels().map((label) => (
            <div key={label} className="py-1">
              {label.slice(0, 1)}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((date, index) => {
            if (!date) return <div key={`empty-${index}`} className="aspect-square" />;
            const planned = dates.has(date);
            const isToday = date === today;
            return (
              <button
                key={date}
                type="button"
                onClick={() => toggleDate(date)}
                aria-pressed={planned}
                aria-label={`${parseCalendarDate(date).toLocaleDateString("en-GB", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}${planned ? ", planned" : ""}`}
                className={`aspect-square rounded-xl text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[var(--plan)] ${
                  planned
                    ? "bg-[var(--plan)] text-white"
                    : isToday
                      ? "text-[var(--plan)] ring-2 ring-[var(--plan)]"
                      : date < today
                        ? "text-[var(--ink-faint)]"
                        : "text-[var(--ink)] lg:hover:bg-[var(--chip)]"
                }`}
              >
                {parseCalendarDate(date).getDate()}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          {[...dates].some((date) => date >= today) ? (
            <button
              type="button"
              onClick={() => removeUpcomingByRecipe(recipeId)}
              className="rounded-xl px-3.5 py-2 text-sm font-semibold text-[var(--muted)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--plan)]"
            >
              Remove from calendar
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-[var(--plan)] px-3.5 py-2 text-sm font-semibold text-white"
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AddToCalendarPicker } from "@/components/AddToCalendarPicker";
import { CalendarIcon } from "@/components/CalendarIcon";
import { useCalendar } from "@/components/CalendarProvider";
import {
  addDays,
  addMonths,
  entriesOnDate,
  formatDayHeading,
  formatMonthTitle,
  formatWeekRange,
  isCurrentWeek,
  isSameMonth,
  monthGrid,
  parseCalendarDate,
  toCalendarDate,
  todayDate,
  weekDates,
  weekdayLabels,
} from "@/lib/calendar";
import type { CalendarEntry } from "@/lib/calendar";

export const CALENDAR_TITLE_ID = "cook-calendar-title";

const DISPLAY_FONT = "var(--font-display), Georgia, serif";

type CalendarView = "week" | "month";

function Chevron({ dir }: { dir: "prev" | "next" }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      aria-hidden="true"
    >
      <path
        d={dir === "prev" ? "M11 4.5 6.5 9 11 13.5" : "M7 4.5 11.5 9 7 13.5"}
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M4 4l8 8M12 4l-8 8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CalendarRecipeRow({
  entry,
  past,
  onRemove,
  onNavigate,
}: {
  entry: CalendarEntry;
  past: boolean;
  onRemove: () => void;
  onNavigate?: () => void;
}) {
  return (
    <div
      className={`flex items-center gap-1 rounded-xl border border-[var(--line)] bg-[var(--paper)] ${
        past ? "opacity-55" : ""
      }`}
    >
      <Link
        href={`/recipe/${entry.recipeId}`}
        onClick={onNavigate}
        className="flex min-h-11 min-w-0 flex-1 items-center gap-2.5 px-2.5 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-[var(--plan)]"
      >
        {entry.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={entry.imageUrl}
            alt=""
            className="h-10 w-10 shrink-0 rounded-lg object-cover [image-orientation:none]"
          />
        ) : (
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[var(--chip)] text-[var(--plan)]">
            <CalendarIcon size={16} />
          </span>
        )}
        <span className="min-w-0 truncate text-sm font-semibold">{entry.title}</span>
      </Link>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${entry.title} from ${formatDayHeading(entry.cookDate)}`}
        className="grid h-11 w-11 shrink-0 place-items-center text-[var(--ink-faint)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--plan)] lg:hover:text-[var(--danger)]"
      >
        <CloseIcon />
      </button>
    </div>
  );
}

function AddRecipeButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-11 w-full items-center justify-center rounded-xl border border-dashed border-[var(--ink-faint)] px-3 text-sm font-semibold text-[var(--plan)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--plan)] lg:hover:border-[var(--plan)]"
    >
      {label}
    </button>
  );
}

function EmptyDayNote() {
  return <p className="px-1 py-1.5 text-sm text-[var(--muted)]">No recipes</p>;
}

export function CalendarPanel({ onNavigate }: { onNavigate?: () => void }) {
  const { entries, calendarOpen, removeEntry } = useCalendar();
  const [view, setView] = useState<CalendarView>("week");
  const [anchor, setAnchor] = useState(() => new Date());
  const [selected, setSelected] = useState(() => todayDate());
  const [pickingFor, setPickingFor] = useState<string | null>(null);
  const today = todayDate();

  useEffect(() => {
    if (!calendarOpen) return;
    const now = new Date();
    setView("week");
    setAnchor(now);
    setSelected(todayDate(now));
    setPickingFor(null);
  }, [calendarOpen]);

  useEffect(() => {
    if (view !== "month") return;
    const selectedDate = parseCalendarDate(selected);
    if (isSameMonth(selectedDate, anchor.getFullYear(), anchor.getMonth())) return;
    const now = new Date();
    if (isSameMonth(now, anchor.getFullYear(), anchor.getMonth())) {
      setSelected(todayDate(now));
    } else {
      setSelected(toCalendarDate(new Date(anchor.getFullYear(), anchor.getMonth(), 1)));
    }
  }, [view, anchor, selected]);

  const week = useMemo(() => weekDates(anchor), [anchor]);
  const monthCells = useMemo(
    () => monthGrid(anchor.getFullYear(), anchor.getMonth()),
    [anchor],
  );

  const onCurrentPeriod =
    view === "week"
      ? isCurrentWeek(anchor)
      : isSameMonth(new Date(), anchor.getFullYear(), anchor.getMonth());

  const title =
    view === "week"
      ? isCurrentWeek(anchor)
        ? "This week"
        : formatWeekRange(anchor)
      : formatMonthTitle(anchor.getFullYear(), anchor.getMonth());

  function goToday() {
    const now = new Date();
    setAnchor(now);
    setSelected(todayDate(now));
  }

  function goPrev() {
    setAnchor((current) =>
      view === "week" ? addDays(current, -7) : addMonths(current, -1),
    );
  }

  function goNext() {
    setAnchor((current) =>
      view === "week" ? addDays(current, 7) : addMonths(current, 1),
    );
  }

  function openAddRecipe(date: string) {
    if (date < today) return;
    setPickingFor(date);
  }

  const pickingDate = pickingFor && pickingFor >= today ? pickingFor : null;
  const selectedEntries = entriesOnDate(entries, selected);
  const selectedPast = selected < today;

  if (pickingDate) {
    return (
      <div className="flex min-h-0 flex-1 flex-col lg:pt-5">
        <header data-sheet-chrome className="px-5 pb-2">
          <h2
            id={CALENDAR_TITLE_ID}
            tabIndex={-1}
            className="text-[1.375rem] font-bold leading-tight tracking-[-0.01em] outline-none"
            style={{ fontFamily: DISPLAY_FONT }}
          >
            Calendar
          </h2>
        </header>
        <AddToCalendarPicker date={pickingDate} onClose={() => setPickingFor(null)} />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:pt-5">
      <header data-sheet-chrome className="px-5 pb-3">
        <div className="flex items-start justify-between gap-3">
          <h2
            id={CALENDAR_TITLE_ID}
            tabIndex={-1}
            className="text-[1.375rem] font-bold leading-tight tracking-[-0.01em] outline-none"
            style={{ fontFamily: DISPLAY_FONT }}
          >
            Calendar
          </h2>
          <div
            className="flex shrink-0 rounded-full bg-[var(--chip)] p-0.5"
            role="group"
            aria-label="Calendar view"
          >
            {(["week", "month"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={view === mode}
                onClick={() => setView(mode)}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold capitalize outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--plan)] ${
                  view === mode
                    ? "bg-[var(--ink)] text-[var(--paper)]"
                    : "text-[var(--muted)] lg:hover:text-[var(--ink)]"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 flex items-center gap-1">
          <button
            type="button"
            onClick={goPrev}
            aria-label={view === "week" ? "Previous week" : "Previous month"}
            className="grid h-9 w-9 place-items-center rounded-full text-[var(--ink)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--plan)] lg:hover:bg-[var(--chip)]"
          >
            <Chevron dir="prev" />
          </button>
          <p className="min-w-0 flex-1 text-center text-sm font-semibold">{title}</p>
          <button
            type="button"
            onClick={goNext}
            aria-label={view === "week" ? "Next week" : "Next month"}
            className="grid h-9 w-9 place-items-center rounded-full text-[var(--ink)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--plan)] lg:hover:bg-[var(--chip)]"
          >
            <Chevron dir="next" />
          </button>
          <button
            type="button"
            onClick={goToday}
            disabled={onCurrentPeriod}
            className="ml-1 rounded-full px-2.5 py-1 text-xs font-semibold text-[var(--plan)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--plan)] disabled:opacity-0"
          >
            Today
          </button>
        </div>
      </header>

      <div data-sheet-scroll className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
        {view === "week" ? (
          <ol className="space-y-4">
            {week.map((date) => {
              const dayEntries = entriesOnDate(entries, date);
              const past = date < today;
              const isToday = date === today;
              const parsed = parseCalendarDate(date);
              return (
                <li key={date}>
                  <div className="mb-2 flex items-baseline justify-between gap-2">
                    <h3
                      className={`text-sm font-semibold ${
                        isToday ? "text-[var(--plan)]" : "text-[var(--ink)]"
                      }`}
                    >
                      {parsed.toLocaleDateString("en-GB", { weekday: "long" })}
                      <span className="ml-2 font-medium text-[var(--muted)]">
                        {parsed.getDate()} {parsed.toLocaleDateString("en-GB", { month: "short" })}
                      </span>
                    </h3>
                    {isToday ? (
                      <span className="text-[0.7rem] font-bold uppercase tracking-wide text-[var(--plan)]">
                        Today
                      </span>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    {dayEntries.map((entry) => (
                      <CalendarRecipeRow
                        key={entry.id}
                        entry={entry}
                        past={past}
                        onRemove={() => removeEntry(entry.id)}
                        onNavigate={onNavigate}
                      />
                    ))}
                    {!past ? (
                      <AddRecipeButton
                        onClick={() => openAddRecipe(date)}
                        label={dayEntries.length ? "Add another recipe" : "Add recipe"}
                      />
                    ) : dayEntries.length === 0 ? (
                      <EmptyDayNote />
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <div>
            <div className="grid grid-cols-7 gap-1 text-center text-[0.7rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
              {weekdayLabels().map((label) => (
                <div key={label} className="py-1">
                  {label.slice(0, 1)}
                </div>
              ))}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1">
              {monthCells.map((date, index) => {
                if (!date) {
                  return <div key={`empty-${index}`} className="aspect-square" />;
                }
                const dayEntries = entriesOnDate(entries, date);
                const isToday = date === today;
                const isSelected = date === selected;
                const past = date < today;
                const dayNum = parseCalendarDate(date).getDate();
                const dots = Math.min(dayEntries.length, 3);
                return (
                  <button
                    key={date}
                    type="button"
                    onClick={() => setSelected(date)}
                    aria-pressed={isSelected}
                    aria-label={formatDayHeading(date)}
                    className={`flex aspect-square flex-col items-center justify-center rounded-xl text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[var(--plan)] ${
                      isSelected
                        ? "bg-[var(--plan)] text-white"
                        : isToday
                          ? "text-[var(--plan)] ring-2 ring-[var(--plan)]"
                          : past
                            ? "text-[var(--ink-faint)]"
                            : "text-[var(--ink)]"
                    }`}
                  >
                    {dayNum}
                    <span className="mt-0.5 flex h-1.5 items-center justify-center gap-0.5">
                      {Array.from({ length: dots }, (_, i) => (
                        <span
                          key={i}
                          className={`h-1 w-1 rounded-full ${
                            isSelected ? "bg-white" : "bg-[var(--plan)]"
                          }`}
                        />
                      ))}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-5">
              <h3 className="mb-2 text-sm font-semibold">
                {formatDayHeading(selected)}
                {selected === today ? (
                  <span className="ml-2 text-[0.7rem] font-bold uppercase tracking-wide text-[var(--plan)]">
                    Today
                  </span>
                ) : null}
              </h3>
              <div className="space-y-2">
                {selectedEntries.map((entry) => (
                  <CalendarRecipeRow
                    key={entry.id}
                    entry={entry}
                    past={selectedPast}
                    onRemove={() => removeEntry(entry.id)}
                    onNavigate={onNavigate}
                  />
                ))}
                {!selectedPast ? (
                  <AddRecipeButton
                    onClick={() => openAddRecipe(selected)}
                    label={
                      selectedEntries.length
                        ? "Add another recipe"
                        : "Add recipe"
                    }
                  />
                ) : selectedEntries.length === 0 ? (
                  <EmptyDayNote />
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

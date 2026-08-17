"use client";

import { useMemo, useState } from "react";
import { useCalendar } from "@/components/CalendarProvider";
import { formatDayHeading } from "@/lib/calendar";
import type { CalendarRecipeOption } from "@/lib/calendar";

export function AddToCalendarPicker({
  date,
  onClose,
}: {
  date: string;
  onClose: () => void;
}) {
  const { recipes, entries, addToCalendar } = useCalendar();
  const [query, setQuery] = useState("");
  const taken = useMemo(
    () =>
      new Set(
        entries.filter((entry) => entry.cookDate === date).map((entry) => entry.recipeId),
      ),
    [entries, date],
  );
  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return recipes.filter((recipe) =>
      needle ? recipe.title.toLowerCase().includes(needle) : true,
    );
  }, [recipes, query]);

  function pick(recipe: CalendarRecipeOption) {
    if (taken.has(recipe.id)) return;
    addToCalendar({
      recipeId: recipe.id,
      cookDate: date,
      title: recipe.title,
      imageUrl: recipe.imageUrl,
    });
    onClose();
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div data-sheet-chrome className="flex items-center gap-2 px-5 pb-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md px-1 py-1 text-sm font-semibold text-[var(--plan)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--plan)]"
        >
          Back
        </button>
        <p className="min-w-0 truncate text-sm text-[var(--muted)]">
          Add to {formatDayHeading(date)}
        </p>
      </div>
      <div data-sheet-chrome className="px-5 pb-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search recipes"
          aria-label="Search recipes"
          className="w-full rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3 text-base outline-none ring-[var(--plan)] placeholder:text-[var(--muted)] focus:ring-2"
        />
      </div>
      <div data-sheet-scroll className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
        {shown.length === 0 ? (
          <p className="pt-8 text-center text-sm text-[var(--muted)]">
            No recipes match.
          </p>
        ) : (
          <ul className="space-y-2">
            {shown.map((recipe) => {
              const already = taken.has(recipe.id);
              return (
                <li key={recipe.id}>
                  <button
                    type="button"
                    disabled={already}
                    onClick={() => pick(recipe)}
                    className="flex w-full items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] px-2.5 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--plan)] disabled:opacity-45"
                  >
                    {recipe.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={recipe.imageUrl}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded-lg object-cover [image-orientation:none]"
                      />
                    ) : (
                      <span className="h-10 w-10 shrink-0 rounded-lg bg-[var(--chip)]" />
                    )}
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                      {recipe.title}
                    </span>
                    {already ? (
                      <span className="shrink-0 text-xs font-semibold text-[var(--muted)]">
                        Added
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

"use client";

import { displayQty, setDisplayQty } from "@/lib/filters";
import type { Ingredient } from "@/lib/types";

export type ListedIngredient = Ingredient & { pantry: boolean };

export function splitPantry(items: ListedIngredient[]): {
  ingredients: Ingredient[];
  pantry: Ingredient[];
} {
  const ingredients: Ingredient[] = [];
  const pantry: Ingredient[] = [];
  for (const item of items) {
    if (!item.name.trim()) continue;
    const { pantry: isPantry, ...rest } = item;
    if (isPantry) pantry.push(rest);
    else ingredients.push(rest);
  }
  return { ingredients, pantry };
}

function ServingsControl({
  servings,
  baseServings,
  onServings,
}: {
  servings: number;
  baseServings?: number;
  onServings: (n: number) => void;
}) {
  if (baseServings != null) {
    return (
      <div className="flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--card)] px-1 py-1 text-sm font-semibold">
        <button
          type="button"
          disabled={servings <= 1}
          onClick={() => onServings(Math.max(1, servings - 1))}
          className="grid h-7 w-7 place-items-center rounded-full text-[var(--ink)] transition-colors disabled:opacity-30 lg:hover:bg-[var(--chip)]"
          aria-label="Fewer servings"
        >
          −
        </button>
        <span className="min-w-[5.5rem] text-center text-[var(--ink)]">
          Serves {servings}
        </span>
        <button
          type="button"
          onClick={() => onServings(servings + 1)}
          className="grid h-7 w-7 place-items-center rounded-full text-[var(--ink)] transition-colors lg:hover:bg-[var(--chip)]"
          aria-label="More servings"
        >
          +
        </button>
      </div>
    );
  }

  return (
    <div className="flex overflow-hidden rounded-full border border-[var(--line)] bg-[var(--card)] text-sm font-semibold">
      {([2, 3, 4] as const).map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onServings(n)}
          className={`px-3 py-1.5 transition-colors ${
            servings === n
              ? "bg-[var(--ink)] text-[var(--paper)]"
              : "text-[var(--muted)] lg:hover:bg-[var(--chip)]"
          }`}
        >
          {n}p
        </button>
      ))}
    </div>
  );
}

export function EditableIngredients({
  items,
  servings,
  baseServings,
  checked,
  editing,
  className = "",
  onToggleEdit,
  onServings,
  onChange,
  onToggleChecked,
}: {
  items: ListedIngredient[];
  servings: number;
  baseServings?: number;
  checked: Set<string>;
  editing: boolean;
  className?: string;
  onToggleEdit?: () => void;
  onServings: (n: number) => void;
  onChange: (items: ListedIngredient[]) => void;
  onToggleChecked: (key: string) => void;
}) {
  function update(index: number, next: ListedIngredient) {
    onChange(items.map((item, i) => (i === index ? next : item)));
  }

  return (
    <section className={`mt-6 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Ingredients</h2>
        <div className="flex items-center gap-2">
          <ServingsControl
            servings={servings}
            baseServings={baseServings}
            onServings={onServings}
          />
          {onToggleEdit ? (
            <button
              type="button"
              onClick={onToggleEdit}
              className="text-sm font-semibold text-[var(--accent)]"
            >
              {editing ? "Done" : "Edit"}
            </button>
          ) : null}
        </div>
      </div>

      {editing ? (
        <ul className="mt-3 space-y-3">
          {items.map((item, index) => (
            <li
              key={index}
              className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-3"
            >
              <div className="flex gap-2">
                <input
                  value={displayQty(item, servings, baseServings)}
                  onChange={(e) =>
                    update(index, {
                      ...setDisplayQty(item, servings, e.target.value, baseServings),
                      pantry: item.pantry,
                    })
                  }
                  placeholder="Qty"
                  className="w-24 rounded-xl border border-[var(--line)] bg-[var(--paper)] px-2 py-2 text-sm outline-none ring-[var(--accent)] focus:ring-2"
                />
                <input
                  value={item.name}
                  onChange={(e) => update(index, { ...item, name: e.target.value })}
                  placeholder="Ingredient"
                  className="min-w-0 flex-1 rounded-xl border border-[var(--line)] bg-[var(--paper)] px-2 py-2 text-sm outline-none ring-[var(--accent)] focus:ring-2"
                />
              </div>
              <div className="mt-2 flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
                  <input
                    type="checkbox"
                    checked={item.pantry}
                    onChange={(e) =>
                      update(index, { ...item, pantry: e.target.checked })
                    }
                  />
                  Pantry
                </label>
                <button
                  type="button"
                  onClick={() => onChange(items.filter((_, i) => i !== index))}
                  className="text-sm font-semibold text-[var(--accent)]"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="mt-3 divide-y divide-[var(--line)]">
          {items.map((item, index) => {
            const key = `${item.name}-${index}`;
            const on = checked.has(key);
            return (
              <li key={key}>
                <button
                  type="button"
                  onClick={() => onToggleChecked(key)}
                  className="flex w-full items-start gap-3 py-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent)] lg:-mx-2 lg:w-[calc(100%+1rem)] lg:rounded-lg lg:px-2 lg:hover:bg-[var(--chip)]/50"
                >
                  <span
                    className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border ${
                      on
                        ? "border-[var(--sage)] bg-[var(--sage)] text-white"
                        : "border-[var(--line)] bg-[var(--card)]"
                    }`}
                  >
                    {on ? "✓" : ""}
                  </span>
                  <span className={on ? "text-[var(--muted)] line-through" : ""}>
                    <span className="font-semibold">
                      {displayQty(item, servings, baseServings)}
                    </span>{" "}
                    {item.name}
                    {item.pantry ? (
                      <span className="text-[var(--muted)]"> · pantry</span>
                    ) : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {editing && (
        <button
          type="button"
          onClick={() =>
            onChange([
              ...items,
              { name: "", qty2: "", pantry: false },
            ])
          }
          className="mt-3 text-sm font-semibold text-[var(--accent)]"
        >
          + Add ingredient
        </button>
      )}
    </section>
  );
}

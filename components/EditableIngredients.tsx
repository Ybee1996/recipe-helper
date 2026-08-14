"use client";

import { qtyForServings, setQtyForServings } from "@/lib/filters";
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

export function EditableIngredients({
  items,
  servings,
  checked,
  editing,
  onToggleEdit,
  onServings,
  onChange,
  onToggleChecked,
}: {
  items: ListedIngredient[];
  servings: 2 | 3 | 4;
  checked: Set<string>;
  editing: boolean;
  onToggleEdit: () => void;
  onServings: (n: 2 | 3 | 4) => void;
  onChange: (items: ListedIngredient[]) => void;
  onToggleChecked: (key: string) => void;
}) {
  function update(index: number, next: ListedIngredient) {
    onChange(items.map((item, i) => (i === index ? next : item)));
  }

  return (
    <section className="mt-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Ingredients</h2>
        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-full border border-[var(--line)] bg-[var(--card)] text-sm font-semibold">
            {([2, 3, 4] as const).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onServings(n)}
                className={`px-3 py-1.5 ${
                  servings === n
                    ? "bg-[var(--ink)] text-[var(--paper)]"
                    : "text-[var(--muted)]"
                }`}
              >
                {n}p
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onToggleEdit}
            className="text-sm font-semibold text-[var(--accent)]"
          >
            {editing ? "Done" : "Edit"}
          </button>
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
                  value={qtyForServings(item, servings)}
                  onChange={(e) =>
                    update(index, {
                      ...setQtyForServings(item, servings, e.target.value),
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
                  className="flex w-full items-start gap-3 py-3 text-left"
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
                      {qtyForServings(item, servings)}
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

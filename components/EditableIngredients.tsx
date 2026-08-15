"use client";

import { useState } from "react";
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

function BasketIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M2.5 5.5h11l-.85 6.2a1.5 1.5 0 0 1-1.49 1.3H4.84a1.5 1.5 0 0 1-1.49-1.3L2.5 5.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M5.5 5.5V4a2.5 2.5 0 0 1 5 0v1.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M3.5 8.5 6.5 11.5 12.5 4.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
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
  editing,
  className = "",
  onToggleEdit,
  onServings,
  onChange,
  onAddToShoppingList,
  onAddAllToShoppingList,
}: {
  items: ListedIngredient[];
  servings: number;
  baseServings?: number;
  editing: boolean;
  className?: string;
  onToggleEdit?: () => void;
  onServings: (n: number) => void;
  onChange: (items: ListedIngredient[]) => void;
  onAddToShoppingList?: (item: ListedIngredient, qty: string) => void;
  onAddAllToShoppingList?: () => void;
}) {
  const [addedKeys, setAddedKeys] = useState<Set<string>>(new Set());
  const [allAdded, setAllAdded] = useState(false);

  function flashKey(key: string) {
    setAddedKeys((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
    window.setTimeout(() => {
      setAddedKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }, 1400);
  }

  function update(index: number, next: ListedIngredient) {
    onChange(items.map((item, i) => (i === index ? next : item)));
  }

  function handleAddAll() {
    onAddAllToShoppingList?.();
    setAllAdded(true);
    window.setTimeout(() => setAllAdded(false), 1400);
  }

  return (
    <section className={`mt-6 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="min-w-0 shrink text-lg font-semibold">Ingredients</h2>
        <div className="flex shrink-0 items-center gap-2">
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

      {!editing && onAddAllToShoppingList ? (
        <button
          type="button"
          onClick={handleAddAll}
          className={`mt-3 flex w-full items-center justify-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
            allAdded
              ? "border-[var(--sage)] bg-[var(--sage)]/10 text-[var(--sage)]"
              : "border-[var(--line)] bg-[var(--paper)] text-[var(--accent)] lg:hover:bg-[var(--chip)]"
          }`}
        >
          {allAdded ? <CheckIcon /> : <BasketIcon />}
          {allAdded ? "Added to list" : "Add to shopping list"}
        </button>
      ) : null}

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
            const qty = displayQty(item, servings, baseServings);
            const justAdded = addedKeys.has(key);
            return (
              <li key={key} className="flex items-center gap-1">
                <span className="min-w-0 flex-1 py-3">
                  <span className="font-semibold">{qty}</span> {item.name}
                  {item.pantry ? (
                    <span className="text-[var(--muted)]"> · pantry</span>
                  ) : null}
                </span>
                {onAddToShoppingList ? (
                  <button
                    type="button"
                    onClick={() => {
                      onAddToShoppingList(item, qty);
                      flashKey(key);
                    }}
                    aria-label={
                      justAdded
                        ? `${item.name} added to shopping list`
                        : `Add ${item.name} to shopping list`
                    }
                    title={justAdded ? "Added" : "Add to shopping list"}
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-full outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                      justAdded
                        ? "text-[var(--sage)]"
                        : "text-[var(--muted)] lg:hover:bg-[var(--chip)] lg:hover:text-[var(--accent)]"
                    }`}
                  >
                    {justAdded ? <CheckIcon /> : <BasketIcon />}
                  </button>
                ) : null}
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

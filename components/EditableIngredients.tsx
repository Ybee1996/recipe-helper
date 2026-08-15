"use client";

import { useEffect, useState } from "react";
import { BasketIcon } from "@/components/BasketIcon";
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

function ShoppingToast({ message }: { message: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-24 z-30 flex justify-center px-4 lg:bottom-8"
    >
      <p className="max-w-sm rounded-full bg-[var(--ink)] px-4 py-2.5 text-center text-sm font-semibold text-[var(--paper)] shadow-lg">
        {message}
      </p>
    </div>
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
  onToggleShoppingItem,
  onToggleAllShopping,
  shoppingNamesFromRecipe,
}: {
  items: ListedIngredient[];
  servings: number;
  baseServings?: number;
  editing: boolean;
  className?: string;
  onToggleEdit?: () => void;
  onServings: (n: number) => void;
  onChange: (items: ListedIngredient[]) => void;
  onToggleShoppingItem?: (item: ListedIngredient, qty: string, onList: boolean) => void;
  onToggleAllShopping?: (allOnList: boolean) => void;
  shoppingNamesFromRecipe?: Set<string>;
}) {
  const [toast, setToast] = useState<{ id: number; message: string } | null>(
    null,
  );
  // In edit mode, servings is the stored yield — don't scale listed quantities.
  const qtyBase = editing && baseServings != null ? servings : baseServings;

  const shoppable = items.filter((item) => !item.pantry && item.name.trim());
  const allOnList =
    shoppable.length > 0 &&
    shoppable.every((item) =>
      shoppingNamesFromRecipe?.has(item.name.trim()),
    );

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function showToast(message: string) {
    setToast({ id: Date.now(), message });
  }

  function update(index: number, next: ListedIngredient) {
    onChange(items.map((item, i) => (i === index ? next : item)));
  }

  function handleToggleItem(item: ListedIngredient, qty: string, onList: boolean) {
    onToggleShoppingItem?.(item, qty, onList);
    const name = item.name.trim() || "Item";
    showToast(onList ? `Removed ${name} from list` : `Added ${name} to list`);
  }

  function handleToggleAll(onList: boolean) {
    onToggleAllShopping?.(onList);
    showToast(onList ? "Removed ingredients from list" : "Added ingredients to list");
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

      {!editing && onToggleAllShopping ? (
        <button
          type="button"
          onClick={() => handleToggleAll(Boolean(allOnList))}
          className={`mt-3 flex w-full items-center justify-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
            allOnList
              ? "border-[var(--sage)] bg-[var(--sage)]/20 text-[var(--sage)]"
              : "border-[var(--line)] bg-[var(--paper)] text-[var(--accent)] lg:hover:bg-[var(--chip)]"
          }`}
        >
          <BasketIcon />
          {allOnList ? "Remove from list" : "Add to shopping list"}
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
                  value={displayQty(item, servings, qtyBase)}
                  onChange={(e) =>
                    update(index, {
                      ...setDisplayQty(item, servings, e.target.value, qtyBase),
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
            const qty = displayQty(item, servings, qtyBase);
            const onList = Boolean(
              item.name.trim() && shoppingNamesFromRecipe?.has(item.name.trim()),
            );
            return (
              <li key={key} className="flex items-center gap-1">
                <span className="min-w-0 flex-1 py-3">
                  <span className="font-semibold">{qty}</span> {item.name}
                  {item.pantry ? (
                    <span className="text-[var(--muted)]"> · pantry</span>
                  ) : null}
                </span>
                {onToggleShoppingItem ? (
                  <button
                    type="button"
                    onClick={() => handleToggleItem(item, qty, onList)}
                    aria-label={
                      onList
                        ? `Remove ${item.name} from shopping list`
                        : `Add ${item.name} to shopping list`
                    }
                    title={
                      onList
                        ? "Remove from shopping list"
                        : "Add to shopping list"
                    }
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-full outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                      onList
                        ? "bg-[var(--sage)]/20 text-[var(--sage)] lg:hover:bg-[var(--sage)]/30"
                        : "text-[var(--muted)] lg:hover:bg-[var(--chip)] lg:hover:text-[var(--accent)]"
                    }`}
                  >
                    <BasketIcon />
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

      {toast ? <ShoppingToast key={toast.id} message={toast.message} /> : null}
    </section>
  );
}

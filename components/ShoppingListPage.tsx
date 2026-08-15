"use client";

import Link from "next/link";
import { useState } from "react";
import { useShoppingList } from "@/components/ShoppingListProvider";

export function ShoppingListPage() {
  const { items, addItem, removeItem, toggleItem, clearChecked } = useShoppingList();
  const [name, setName] = useState("");
  const [qty, setQty] = useState("");

  const unchecked = items.filter((item) => !item.checked);
  const checked = items.filter((item) => item.checked);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    addItem({ name: trimmed, qty: qty.trim() });
    setName("");
    setQty("");
  }

  return (
    <div className="px-4 pb-8 pt-4 lg:mx-auto lg:max-w-lg lg:px-10 lg:pb-16 lg:pt-8">
      <h1
        className="text-[1.75rem] font-medium leading-tight lg:text-4xl"
        style={{ fontFamily: "var(--font-display), Georgia, serif" }}
      >
        Shopping list
      </h1>

      <form onSubmit={handleAdd} className="mt-5 flex gap-2">
        <input
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          placeholder="Qty"
          className="w-20 rounded-xl border border-[var(--line)] bg-[var(--card)] px-2.5 py-2.5 text-sm outline-none ring-[var(--accent)] focus:ring-2"
        />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Add item…"
          className="min-w-0 flex-1 rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 py-2.5 text-sm outline-none ring-[var(--accent)] focus:ring-2"
        />
        <button
          type="submit"
          disabled={!name.trim()}
          className="shrink-0 rounded-full bg-[var(--ink)] px-4 py-2.5 text-sm font-semibold text-[var(--paper)] disabled:opacity-40"
        >
          Add
        </button>
      </form>

      {items.length === 0 ? (
        <p className="mt-8 text-center text-sm text-[var(--muted)]">
          Your list is empty. Add items here or from a recipe page.
        </p>
      ) : (
        <>
          {unchecked.length > 0 && (
            <ul className="mt-6 divide-y divide-[var(--line)]">
              {unchecked.map((item) => (
                <ShoppingRow
                  key={item.id}
                  item={item}
                  onToggle={() => toggleItem(item.id)}
                  onRemove={() => removeItem(item.id)}
                />
              ))}
            </ul>
          )}

          {checked.length > 0 && (
            <section className="mt-8">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                  Got it
                </h2>
                <button
                  type="button"
                  onClick={clearChecked}
                  className="text-sm font-semibold text-[var(--accent)]"
                >
                  Clear
                </button>
              </div>
              <ul className="mt-2 divide-y divide-[var(--line)]">
                {checked.map((item) => (
                  <ShoppingRow
                    key={item.id}
                    item={item}
                    onToggle={() => toggleItem(item.id)}
                    onRemove={() => removeItem(item.id)}
                  />
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function ShoppingRow({
  item,
  onToggle,
  onRemove,
}: {
  item: { id: string; name: string; qty: string; recipeId?: string; recipeTitle?: string; checked: boolean };
  onToggle: () => void;
  onRemove: () => void;
}) {
  return (
    <li className="flex items-start gap-2 py-3">
      <button
        type="button"
        onClick={onToggle}
        aria-label={item.checked ? "Mark as needed" : "Mark as got"}
        className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent)] lg:hover:bg-[var(--chip)]/50"
        style={
          item.checked
            ? { borderColor: "var(--sage)", background: "var(--sage)", color: "white" }
            : { borderColor: "var(--line)", background: "var(--card)" }
        }
      >
        {item.checked ? "✓" : ""}
      </button>

      <div
        className={`min-w-0 flex-1 py-3 ${
          item.checked ? "text-[var(--muted)] line-through" : ""
        }`}
      >
        <button
          type="button"
          onClick={onToggle}
          className="w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] lg:rounded-lg lg:px-1 lg:hover:bg-[var(--chip)]/50"
        >
          <span className="font-semibold">{item.qty ? `${item.qty} ` : ""}</span>
          {item.name}
        </button>
        {item.recipeTitle ? (
          <p className="mt-0.5 px-1 text-xs text-[var(--muted)]">
            {item.recipeId ? (
              <Link href={`/recipe/${item.recipeId}`} className="text-[var(--accent)] lg:hover:underline">
                {item.recipeTitle}
              </Link>
            ) : (
              item.recipeTitle
            )}
          </p>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${item.name}`}
        className="shrink-0 rounded-full px-2 py-1 text-sm font-semibold text-[var(--accent)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] lg:hover:bg-[var(--chip)]"
      >
        ×
      </button>
    </li>
  );
}

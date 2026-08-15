"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useShoppingList } from "@/components/ShoppingListProvider";
import type { ShoppingItem } from "@/lib/shopping-list";

export const SHOPPING_LIST_TITLE_ID = "shopping-list-title";

const DISPLAY_FONT = "var(--font-display), Georgia, serif";

export function ShoppingListPanel({ onNavigate }: { onNavigate?: () => void }) {
  const { items, addItem, removeItem, toggleItem, clearChecked, clearAll } = useShoppingList();
  const [name, setName] = useState("");
  const [qty, setQty] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);

  const unchecked = items.filter((item) => !item.checked);
  const checked = items.filter((item) => item.checked);
  const total = items.length;

  function submitAdd() {
    const trimmed = name.trim();
    if (!trimmed) return;
    addItem({ name: trimmed, qty: qty.trim() });
    setName("");
    setQty("");
    nameRef.current?.focus({ preventScroll: true });
  }

  function handleAddFocus(e: React.FocusEvent<HTMLInputElement>) {
    e.currentTarget.focus({ preventScroll: true });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:pt-5">
      <header data-sheet-chrome className="flex items-start justify-between gap-3 px-5 pb-3.5">
        <div className="min-w-0">
          <h2
            id={SHOPPING_LIST_TITLE_ID}
            tabIndex={-1}
            className="text-[1.375rem] font-bold leading-tight tracking-[-0.01em] outline-none"
            style={{ fontFamily: DISPLAY_FONT }}
          >
            Shopping list
          </h2>
          {total > 0 ? (
            <p className="mt-1 text-[0.78rem] text-[var(--muted)]">
              {checked.length} of {total} picked up
            </p>
          ) : null}
        </div>
        {total > 0 ? (
          <button
            type="button"
            onClick={clearAll}
            className="mt-1 shrink-0 whitespace-nowrap rounded-md px-1 py-1 text-[0.78rem] font-medium text-[var(--ink-faint)] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent)] lg:hover:text-[var(--danger)]"
          >
            Clear all
          </button>
        ) : null}
      </header>

      {total > 0 ? (
        <p data-sheet-chrome className="px-5 pb-3 text-xs italic text-[var(--ink-faint)]">
          Tap an item once you&rsquo;ve got it
        </p>
      ) : null}

      <div data-sheet-chrome className="flex shrink-0 gap-2 border-y border-[var(--line)] bg-[var(--tint)] px-5 py-3.5">
        <input
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          onFocus={handleAddFocus}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            nameRef.current?.focus({ preventScroll: true });
          }}
          aria-label="Quantity"
          placeholder="Qty"
          maxLength={8}
          autoComplete="off"
          enterKeyHint="next"
          className="w-14 rounded-lg border border-[var(--line)] bg-[var(--card)] px-2 py-2 text-center text-base outline-none placeholder:text-[var(--ink-faint)] focus:border-[var(--accent)] focus:ring-[3px] focus:ring-[var(--accent-soft)] lg:text-sm"
        />
        <input
          ref={nameRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onFocus={handleAddFocus}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            submitAdd();
          }}
          aria-label="Item name"
          placeholder="Add item…"
          maxLength={60}
          autoComplete="off"
          enterKeyHint="done"
          className="min-w-0 flex-1 rounded-lg border border-[var(--line)] bg-[var(--card)] px-2.5 py-2 text-base outline-none placeholder:text-[var(--ink-faint)] focus:border-[var(--accent)] focus:ring-[3px] focus:ring-[var(--accent-soft)] lg:text-sm"
        />
        <button
          type="button"
          disabled={!name.trim()}
          onClick={submitAdd}
          className="shrink-0 rounded-lg bg-[var(--accent)] px-4 text-[0.84rem] font-semibold text-white outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ink)] disabled:opacity-40 lg:hover:bg-[var(--accent-dark)]"
        >
          Add
        </button>
      </div>

      <div data-sheet-scroll className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-1 pt-2">
        {total === 0 ? (
          <p className="px-5 py-9 text-center text-sm leading-relaxed text-[var(--muted)]">
            No items yet.
            <br />
            Add one above, or from a recipe.
          </p>
        ) : (
          <>
            {unchecked.length > 0 ? (
              <ul>
                {unchecked.map((item) => (
                  <ShoppingRow
                    key={item.id}
                    item={item}
                    onToggle={() => toggleItem(item.id)}
                    onRemove={() => removeItem(item.id)}
                    onNavigate={onNavigate}
                  />
                ))}
              </ul>
            ) : null}

            {checked.length > 0 ? (
              <section>
                <div className="flex items-baseline justify-between gap-2 px-2.5 pb-1.5 pt-3.5">
                  <h3 className="text-[0.69rem] font-semibold uppercase tracking-[0.06em] text-[var(--ink-faint)]">
                    Got it &mdash; {checked.length}
                  </h3>
                  <button
                    type="button"
                    onClick={clearChecked}
                    className="rounded-md px-1 text-[0.69rem] font-semibold uppercase tracking-[0.06em] text-[var(--ink-faint)] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent)] lg:hover:text-[var(--danger)]"
                  >
                    Clear
                  </button>
                </div>
                <ul>
                  {checked.map((item) => (
                    <ShoppingRow
                      key={item.id}
                      item={item}
                      onToggle={() => toggleItem(item.id)}
                      onRemove={() => removeItem(item.id)}
                      onNavigate={onNavigate}
                    />
                  ))}
                </ul>
              </section>
            ) : null}
          </>
        )}
      </div>

      <p className="hidden shrink-0 px-5 pb-4 pt-2.5 text-center text-xs text-[var(--ink-faint)] lg:block">
        Saved on this device
      </p>
    </div>
  );
}

function ShoppingRow({
  item,
  onToggle,
  onRemove,
  onNavigate,
}: {
  item: ShoppingItem;
  onToggle: () => void;
  onRemove: () => void;
  onNavigate?: () => void;
}) {
  const qty = item.qty.trim();
  const qtyLabel = qty ? (/^\d+(\.\d+)?$/.test(qty) ? `${qty}×` : qty) : "";

  return (
    <li
      className={`group relative flex select-none items-center gap-2.5 rounded-[10px] px-2.5 py-3 transition-colors ${
        item.checked
          ? "bg-[var(--got)] lg:hover:bg-[var(--chip)]"
          : "lg:hover:bg-[var(--tint)]"
      }`}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={item.checked}
        onClick={onToggle}
        aria-label={qty ? `${qty} ${item.name}` : item.name}
        className="absolute inset-0 rounded-[10px] outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
      />

      <span className="pointer-events-none min-w-[1.15rem] shrink-0 text-right text-[0.78rem] tabular-nums text-[var(--ink-faint)]">
        {qtyLabel}
      </span>

      <span className="pointer-events-none min-w-0 flex-1">
        <span
          className={`block break-words text-base leading-snug ${
            item.checked
              ? "text-[var(--ink-faint)] line-through decoration-[1.5px]"
              : ""
          }`}
          style={{ fontFamily: DISPLAY_FONT }}
        >
          {item.name}
        </span>
        {item.recipeTitle ? (
          <span className="mt-0.5 block text-[0.69rem] text-[var(--ink-faint)]">
            {item.recipeId ? (
              <Link
                href={`/recipe/${item.recipeId}`}
                onClick={onNavigate}
                className="pointer-events-auto relative z-10 outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] lg:hover:text-[var(--accent)] lg:hover:underline"
              >
                {item.recipeTitle}
              </Link>
            ) : (
              item.recipeTitle
            )}
          </span>
        ) : null}
      </span>

      {item.checked ? (
        <span className="pointer-events-none shrink-0 whitespace-nowrap rounded-full bg-[var(--accent-soft)] px-2.5 py-[3px] text-[0.66rem] font-bold uppercase tracking-[0.04em] text-[var(--accent-dark)]">
          Got it
        </span>
      ) : null}

      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${item.name}`}
        className="relative z-10 shrink-0 rounded-md px-1.5 py-1 text-[0.94rem] leading-none text-[var(--ink-faint)] opacity-55 outline-none transition-opacity focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-[var(--accent)] lg:opacity-0 lg:group-hover:opacity-100 lg:hover:text-[var(--danger)]"
      >
        ✕
      </button>
    </li>
  );
}

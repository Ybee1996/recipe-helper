"use client";

import { useMemo, useRef, useState } from "react";
import { useShoppingList } from "@/components/ShoppingListProvider";
import {
  matchShoppingHistory,
  type ShoppingHistoryEntry,
} from "@/lib/shopping-history";
import type { ShoppingItem } from "@/lib/shopping-list";

export const SHOPPING_LIST_TITLE_ID = "shopping-list-title";
const SUGGEST_LIST_ID = "shopping-suggest-list";

const DISPLAY_FONT = "var(--font-display), Georgia, serif";

export function ShoppingListPanel({ onNavigate }: { onNavigate?: () => void }) {
  const { items, addItem, removeItem, clearAll } = useShoppingList();
  const [name, setName] = useState("");
  const [qty, setQty] = useState("");
  const [highlight, setHighlight] = useState(-1);
  const [suggestDismissed, setSuggestDismissed] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const blurTimer = useRef<number>(0);

  const total = items.length;

  const excludeLower = useMemo(
    () =>
      new Set(items.map((item) => item.name.trim().toLowerCase())),
    [items],
  );

  const suggestions = useMemo(() => {
    if (suggestDismissed) return [];
    return matchShoppingHistory(name, excludeLower);
  }, [name, excludeLower, suggestDismissed]);

  function resetAddForm() {
    setName("");
    setQty("");
    setHighlight(-1);
    setSuggestDismissed(false);
    nameRef.current?.focus({ preventScroll: true });
  }

  function submitAdd() {
    const trimmed = name.trim();
    if (!trimmed) return;
    addItem({ name: trimmed, qty: qty.trim() });
    resetAddForm();
  }

  function acceptSuggestion(entry: ShoppingHistoryEntry) {
    const usedQty = qty.trim() ? qty.trim() : entry.qty;
    addItem({ name: entry.name, qty: usedQty });
    resetAddForm();
  }

  function hideSuggestions() {
    setSuggestDismissed(true);
    setHighlight(-1);
  }

  function handleAddFocus(e: React.FocusEvent<HTMLInputElement>) {
    e.currentTarget.focus({ preventScroll: true });
  }

  function handleNameFocus(e: React.FocusEvent<HTMLInputElement>) {
    handleAddFocus(e);
    window.clearTimeout(blurTimer.current);
    setSuggestDismissed(false);
  }

  function handleNameBlur() {
    window.clearTimeout(blurTimer.current);
    blurTimer.current = window.setTimeout(() => setSuggestDismissed(true), 180);
  }

  function handleNameChange(value: string) {
    setName(value);
    setHighlight(-1);
    if (!value.trim()) setSuggestDismissed(false);
  }

  function handleNameKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      if (suggestions.length === 0) return;
      e.preventDefault();
      e.stopPropagation();
      hideSuggestions();
      return;
    }
    if (e.key === "ArrowDown") {
      if (suggestions.length === 0) return;
      e.preventDefault();
      setHighlight((i) => (i + 1) % suggestions.length);
      return;
    }
    if (e.key === "ArrowUp") {
      if (suggestions.length === 0) return;
      e.preventDefault();
      setHighlight((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
      return;
    }
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (highlight >= 0) {
      const picked = suggestions[highlight];
      if (picked) acceptSuggestion(picked);
      return;
    }
    submitAdd();
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
        <p data-sheet-chrome className="px-5 pb-3 text-base italic text-[var(--ink-faint)]">
          Swipe right to remove an item
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
          onChange={(e) => handleNameChange(e.target.value)}
          onFocus={handleNameFocus}
          onBlur={handleNameBlur}
          onKeyDown={handleNameKeyDown}
          aria-label="Item name"
          aria-autocomplete="list"
          aria-expanded={suggestions.length > 0}
          aria-controls={SUGGEST_LIST_ID}
          aria-activedescendant={
            highlight >= 0 ? `${SUGGEST_LIST_ID}-${highlight}` : undefined
          }
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

      {suggestions.length > 0 ? (
        <div
          data-sheet-chrome
          className="relative shrink-0 border-b border-[var(--line)] bg-[var(--card)]"
        >
          <div className="flex items-center justify-between gap-2 px-3">
            <p className="px-2 text-[0.78rem] font-medium text-[var(--muted)]">
              Suggestions
            </p>
            <button
              type="button"
              aria-label="Hide suggestions"
              onPointerDown={(e) => {
                e.preventDefault();
                hideSuggestions();
              }}
              onClick={hideSuggestions}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-md text-[1.19rem] leading-none text-[var(--ink-faint)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] lg:hover:text-[var(--danger)]"
            >
              ✕
            </button>
          </div>
          <ul id={SUGGEST_LIST_ID} role="listbox" className="px-2 pb-2">
            {suggestions.map((entry, index) => {
              const qtyLabel = formatSuggestQty(entry.qty);
              const selected = highlight === index;
              return (
                <li key={entry.name.toLowerCase()}>
                  <button
                    type="button"
                    id={`${SUGGEST_LIST_ID}-${index}`}
                    role="option"
                    aria-selected={selected}
                    tabIndex={-1}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      acceptSuggestion(entry);
                    }}
                    className={`flex min-h-11 w-full items-center gap-2.5 rounded-[10px] px-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                      selected
                        ? "bg-[var(--accent-soft)]"
                        : "lg:hover:bg-[var(--tint)]"
                    }`}
                  >
                    <span
                      className="min-w-0 flex-1 break-words text-xl leading-snug"
                      style={{ fontFamily: DISPLAY_FONT }}
                    >
                      {entry.name}
                    </span>
                    {qtyLabel ? (
                      <span className="shrink-0 text-right text-[1.03rem] tabular-nums text-[var(--ink-faint)]">
                        {qtyLabel}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <div data-sheet-scroll className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-1 pt-2">
        {total === 0 ? (
          <p className="px-5 py-9 text-center text-lg leading-relaxed text-[var(--muted)]">
            No items yet.
            <br />
            Add one above, or from a recipe.
          </p>
        ) : (
          <ul>
            {items.map((item) => (
              <ShoppingRow
                key={item.id}
                item={item}
                onRemove={() => removeItem(item.id)}
              />
            ))}
          </ul>
        )}
      </div>

      <p className="hidden shrink-0 px-5 pb-4 pt-2.5 text-center text-base text-[var(--ink-faint)] lg:block">
        Synced across devices
      </p>
    </div>
  );
}

function formatSuggestQty(qty: string): string {
  const trimmed = qty.trim();
  if (!trimmed) return "";
  return /^\d+(\.\d+)?$/.test(trimmed) ? `${trimmed}×` : trimmed;
}

const SWIPE_LOCK_PX = 8;
const SWIPE_REMOVE_PX = 110;
const EXIT_MS = 180;

type SwipeState = {
  pointerId: number;
  startX: number;
  startY: number;
  locked: "x" | "y" | null;
};

function ShoppingRow({
  item,
  onRemove,
}: {
  item: ShoppingItem;
  onRemove: () => void;
}) {
  const qty = item.qty.trim();
  const qtyLabel = qty ? (/^\d+(\.\d+)?$/.test(qty) ? `${qty}×` : qty) : "";
  const swipe = useRef<SwipeState | null>(null);
  const rowRef = useRef<HTMLLIElement>(null);
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [exiting, setExiting] = useState(false);

  const armed = dx >= SWIPE_REMOVE_PX;

  function commitRemove() {
    if (exiting) return;
    setExiting(true);
    setDx(rowRef.current?.offsetWidth ?? 400);
    window.setTimeout(onRemove, EXIT_MS);
  }

  function onPointerDown(e: React.PointerEvent<HTMLLIElement>) {
    if (exiting || (e.pointerType === "mouse" && e.button !== 0)) return;
    swipe.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      locked: null,
    };
  }

  function onPointerMove(e: React.PointerEvent<HTMLLIElement>) {
    const state = swipe.current;
    if (!state || state.pointerId !== e.pointerId || state.locked === "y") return;
    const moveX = e.clientX - state.startX;
    const moveY = e.clientY - state.startY;
    if (!state.locked) {
      if (Math.max(Math.abs(moveX), Math.abs(moveY)) < SWIPE_LOCK_PX) return;
      if (Math.abs(moveY) > Math.abs(moveX)) {
        state.locked = "y";
        return;
      }
      state.locked = "x";
      e.currentTarget.setPointerCapture(e.pointerId);
      setDragging(true);
    }
    setDx(Math.max(0, moveX));
  }

  function endSwipe(e: React.PointerEvent<HTMLLIElement>, cancelled: boolean) {
    const state = swipe.current;
    if (!state || state.pointerId !== e.pointerId) return;
    swipe.current = null;
    setDragging(false);
    if (!cancelled && state.locked === "x" && armed) {
      commitRemove();
      return;
    }
    setDx(0);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLLIElement>) {
    if (e.key === "Delete" || e.key === "Backspace" || e.key === "ArrowRight") {
      e.preventDefault();
      commitRemove();
    }
  }

  return (
    <li
      ref={rowRef}
      tabIndex={0}
      aria-label={qty ? `${qty} ${item.name}` : item.name}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(e) => endSwipe(e, false)}
      onPointerCancel={(e) => endSwipe(e, true)}
      onKeyDown={onKeyDown}
      className="relative touch-pan-y select-none overflow-hidden rounded-[10px] outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
    >
      <div
        aria-hidden
        className="absolute inset-0 flex items-center bg-[var(--danger)] pl-5 text-white"
        style={{ visibility: dx > 0 ? "visible" : "hidden" }}
      >
        <svg
          viewBox="0 0 24 24"
          width="24"
          height="24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            opacity: Math.min(1, dx / 48),
            transform: `scale(${armed ? 1.2 : 0.85})`,
            transition: "transform 120ms ease",
          }}
        >
          <path d="M3 6h18" />
          <path d="M8 6V4h8v2" />
          <path d="M6 6l1 14h10l1-14" />
          <path d="M10 10v6M14 10v6" />
        </svg>
      </div>

      <div
        className="relative flex items-center gap-2.5 bg-[var(--card)] px-2.5 py-3 lg:hover:bg-[var(--tint)]"
        style={{
          transform: dx ? `translateX(${dx}px)` : undefined,
          transition: dragging
            ? "none"
            : `transform ${EXIT_MS}ms ease-out`,
        }}
      >
        <span
          className="min-w-0 flex-1 break-words text-xl leading-snug"
          style={{ fontFamily: DISPLAY_FONT }}
        >
          {item.name}
        </span>

        {qtyLabel ? (
          <span className="shrink-0 text-right text-[1.03rem] tabular-nums text-[var(--ink-faint)]">
            {qtyLabel}
          </span>
        ) : null}
      </div>
    </li>
  );
}

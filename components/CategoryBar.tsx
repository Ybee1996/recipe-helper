"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  AddCategoryButton,
  chipClass,
  orderedCategoryIds,
} from "@/components/CategoryPicker";
import { useCategories } from "@/components/CategoriesProvider";
import type { Protein } from "@/lib/types";

const HOLD_MS = 420;
const MOVE_CANCEL_PX = 12;
const EXPAND_KEY = "recipe-box-categories-expanded";

function vibratePulse() {
  try {
    navigator.vibrate?.(20);
  } catch {
    // Vibration is best-effort; iOS Safari does not support it.
  }
}

function ChevronIcon({ up }: { up: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {up ? <path d="M6 15l6-6 6 6" /> : <path d="M6 9l6 6 6-6" />}
    </svg>
  );
}

function BinIcon({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 18 18"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 5.5h10M7 5.5V4.25A1.25 1.25 0 0 1 8.25 3h1.5A1.25 1.25 0 0 1 11 4.25V5.5M6.25 5.5l.4 8.1A1.25 1.25 0 0 0 7.9 14.75h2.2a1.25 1.25 0 0 0 1.25-1.15l.4-8.1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function moveId(list: string[], id: string, toIndex: number): string[] {
  const from = list.indexOf(id);
  if (from < 0 || toIndex < 0 || from === toIndex) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(toIndex, 0, item);
  return next;
}

function closestChipIndex(
  x: number,
  y: number,
  container: HTMLElement,
): number {
  const nodes = [
    ...container.querySelectorAll<HTMLElement>("[data-category-id]"),
  ];
  let best = 0;
  let bestDist = Infinity;
  nodes.forEach((node, i) => {
    const rect = node.getBoundingClientRect();
    const dx = rect.left + rect.width / 2 - x;
    const dy = rect.top + rect.height / 2 - y;
    const dist = dx * dx + dy * dy;
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  });
  return best;
}

function pointInRect(
  x: number,
  y: number,
  rect: DOMRect | undefined,
): boolean {
  if (!rect) return false;
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

export function CategoryBar({
  selected,
  onSelect,
  extraIds = [],
  usageCount,
  leading,
}: {
  selected: Protein | null;
  onSelect: (id: Protein | null) => void;
  extraIds?: string[];
  usageCount?: (id: string) => number;
  leading?: ReactNode;
}) {
  const router = useRouter();
  const { categories, order, labelFor, reorder, deleteCategory, isCustom } =
    useCategories();
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const resolved = useMemo(
    () =>
      orderedCategoryIds(
        "filter",
        categories.map((c) => c.id),
        extraIds,
        order,
      ).filter((id) => !removedIds.includes(id)),
    [categories, extraIds, order, removedIds],
  );
  const [ids, setIds] = useState<string[]>(resolved);
  const [expanded, setExpanded] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overBin, setOverBin] = useState(false);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const binRef = useRef<HTMLDivElement>(null);
  const idsRef = useRef(ids);
  const resolvedRef = useRef(resolved);
  const reorderRef = useRef(reorder);
  const suppressClick = useRef(false);
  const holdTimer = useRef<number | null>(null);
  const holdStart = useRef<{
    x: number;
    y: number;
    id: string;
    pointerId: number;
    target: HTMLElement;
  } | null>(null);
  const draggingIdRef = useRef<string | null>(null);
  const overBinRef = useRef(false);
  const stopDrag = useRef<(() => void) | null>(null);

  idsRef.current = ids;
  resolvedRef.current = resolved;
  reorderRef.current = reorder;
  draggingIdRef.current = draggingId;

  useEffect(() => {
    setMounted(true);
    return () => {
      if (holdTimer.current != null) window.clearTimeout(holdTimer.current);
      stopDrag.current?.();
    };
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(EXPAND_KEY);
    if (stored === "1") setExpanded(true);
  }, []);

  useEffect(() => {
    if (draggingId) return;
    setIds(resolved);
  }, [resolved, draggingId]);

  useEffect(() => {
    if (!pendingDelete) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape" || busy) return;
      setPendingDelete(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pendingDelete, busy]);

  function clearHold() {
    if (holdTimer.current != null) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
    holdStart.current = null;
  }

  function startDrag(id: string, pointerId: number, target: HTMLElement, x: number, y: number) {
    suppressClick.current = true;
    setExpanded(true);
    localStorage.setItem(EXPAND_KEY, "1");
    draggingIdRef.current = id;
    overBinRef.current = false;
    setDraggingId(id);
    setOverBin(false);
    setPointer({ x, y });
    vibratePulse();
    clearHold();
    try {
      target.setPointerCapture(pointerId);
    } catch {
      // Capture is best-effort across browsers.
    }

    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";

    function onMove(event: PointerEvent) {
      const dragId = draggingIdRef.current;
      const container = listRef.current;
      if (!dragId) return;
      setPointer({ x: event.clientX, y: event.clientY });
      const inBin = pointInRect(
        event.clientX,
        event.clientY,
        binRef.current?.getBoundingClientRect(),
      );
      overBinRef.current = inBin;
      setOverBin(inBin);
      if (inBin || !container) return;
      const nextIndex = closestChipIndex(
        event.clientX,
        event.clientY,
        container,
      );
      setIds((current) => moveId(current, dragId, nextIndex));
    }

    function onUp() {
      stopDrag.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
      try {
        if (target.hasPointerCapture(pointerId)) {
          target.releasePointerCapture(pointerId);
        }
      } catch {
        // Ignore if the pointer was already released.
      }
      const next = idsRef.current;
      const dragId = draggingIdRef.current;
      const droppedOnBin = overBinRef.current;
      draggingIdRef.current = null;
      overBinRef.current = false;
      setDraggingId(null);
      setOverBin(false);
      setPointer(null);
      if (droppedOnBin && dragId && isCustom(dragId)) {
        setIds(resolvedRef.current);
        setError(null);
        setPendingDelete(dragId);
      } else if (droppedOnBin) {
        setIds(resolvedRef.current);
      } else if (next.join("\0") !== resolvedRef.current.join("\0")) {
        reorderRef.current(next);
      }
      window.setTimeout(() => {
        suppressClick.current = false;
      }, 0);
    }

    stopDrag.current = onUp;
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  function onChipPointerDown(id: string, event: React.PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return;
    clearHold();
    holdStart.current = {
      x: event.clientX,
      y: event.clientY,
      id,
      pointerId: event.pointerId,
      target: event.currentTarget,
    };
    holdTimer.current = window.setTimeout(() => {
      const hold = holdStart.current;
      if (!hold || hold.id !== id) return;
      holdTimer.current = null;
      startDrag(hold.id, hold.pointerId, hold.target, hold.x, hold.y);
    }, HOLD_MS);
  }

  function onChipPointerMove(event: React.PointerEvent) {
    if (!holdStart.current || holdTimer.current == null) return;
    const dx = event.clientX - holdStart.current.x;
    const dy = event.clientY - holdStart.current.y;
    if (dx * dx + dy * dy > MOVE_CANCEL_PX * MOVE_CANCEL_PX) {
      clearHold();
    }
  }

  function onChipPointerUp() {
    if (draggingIdRef.current) return;
    clearHold();
  }

  function toggleExpanded() {
    setExpanded((open) => {
      const next = !open;
      localStorage.setItem(EXPAND_KEY, next ? "1" : "0");
      return next;
    });
  }

  async function confirmDelete() {
    if (!pendingDelete || busy) return;
    setBusy(true);
    setError(null);
    try {
      await deleteCategory(pendingDelete);
      setRemovedIds((current) =>
        current.includes(pendingDelete)
          ? current
          : [...current, pendingDelete],
      );
      if (selected === pendingDelete) onSelect(null);
      setPendingDelete(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete category");
    } finally {
      setBusy(false);
    }
  }

  const draggingCustom = draggingId ? isCustom(draggingId) : false;
  const pendingLabel = pendingDelete ? labelFor(pendingDelete) : "";
  const pendingCount = pendingDelete ? (usageCount?.(pendingDelete) ?? 0) : 0;

  return (
    <div className="mt-3 flex items-start gap-2">
      <div
        ref={listRef}
        className={`flex min-w-0 flex-1 gap-2 pb-1 ${
          draggingId ? "touch-none" : ""
        } ${expanded ? "flex-wrap" : "no-scrollbar overflow-x-auto"}`}
      >
        {leading}
        {ids.map((id) => {
          const on = selected === id;
          const dragging = draggingId === id;
          return (
            <button
              key={id}
              type="button"
              data-category-id={id}
              aria-pressed={on}
              aria-grabbed={dragging ? "true" : "false"}
              title={
                expanded
                  ? "Hold and drag to reorder, or drop on the bin to delete"
                  : undefined
              }
              onPointerDown={(event) => onChipPointerDown(id, event)}
              onPointerMove={onChipPointerMove}
              onPointerUp={onChipPointerUp}
              onPointerCancel={onChipPointerUp}
              onContextMenu={(event) => event.preventDefault()}
              onClick={() => {
                if (suppressClick.current || draggingId) return;
                onSelect(on ? null : id);
              }}
              className={`${chipClass.filter} [-webkit-touch-callout:none] select-none ${
                dragging
                  ? "z-10 scale-105 cursor-grabbing opacity-40 shadow-md"
                  : expanded
                    ? "cursor-grab"
                    : ""
              } ${
                on || dragging
                  ? "bg-[var(--ink)] text-[var(--paper)]"
                  : "bg-[var(--chip)] text-[var(--ink)] lg:hover:bg-[var(--line)]"
              } ${expanded || dragging ? "touch-none" : ""}`}
            >
              {labelFor(id)}
            </button>
          );
        })}
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          aria-expanded={expanded ? "true" : "false"}
          aria-label={expanded ? "Collapse categories" : "Expand categories"}
          title={expanded ? "Collapse categories" : "Expand categories"}
          onClick={toggleExpanded}
          className={`inline-flex h-[2.375rem] w-[2.375rem] shrink-0 items-center justify-center rounded-full outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
            expanded
              ? "bg-[var(--line)] text-[var(--ink)]"
              : "bg-[var(--chip)] text-[var(--ink)] lg:hover:bg-[var(--line)]"
          }`}
        >
          <ChevronIcon up={expanded} />
        </button>
        <AddCategoryButton onAdded={(category) => onSelect(category.id)} />
      </div>

      {mounted && draggingId && pointer
        ? createPortal(
            <>
              <div
                ref={binRef}
                role="group"
                aria-label={
                  draggingCustom
                    ? "Drop here to delete category"
                    : "Default categories can’t be deleted"
                }
                className={`fixed inset-x-4 z-[50] flex items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-semibold text-white shadow-lg transition-transform ${
                  draggingCustom
                    ? overBin
                      ? "scale-[1.03] bg-[var(--danger)]"
                      : "bg-[var(--danger)]/90"
                    : "bg-[var(--ink)]/70"
                }`}
                style={{ top: "max(0.75rem, env(safe-area-inset-top))" }}
              >
                <BinIcon />
                {draggingCustom
                  ? overBin
                    ? "Release to delete"
                    : "Drop here to delete"
                  : "Default categories can’t be deleted"}
              </div>
              <div
                className={`pointer-events-none fixed z-[60] rounded-full px-3.5 py-2 text-sm font-semibold shadow-lg ${
                  overBin && draggingCustom
                    ? "bg-[var(--danger)] text-white"
                    : "bg-[var(--ink)] text-[var(--paper)]"
                }`}
                style={{
                  left: pointer.x,
                  top: pointer.y,
                  transform: "translate(-50%, -130%)",
                }}
              >
                {labelFor(draggingId)}
              </div>
            </>,
            document.body,
          )
        : null}

      {mounted && pendingDelete
        ? createPortal(
            <div
              className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--ink)]/40 p-4 sm:items-center"
              role="presentation"
              onClick={() => {
                if (!busy) setPendingDelete(null);
              }}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="delete-category-title"
                className="w-full max-w-sm rounded-2xl border border-[var(--line)] bg-[var(--card)] p-5 shadow-lg"
                onClick={(event) => event.stopPropagation()}
              >
                <h3
                  id="delete-category-title"
                  className="text-lg font-semibold"
                  style={{ fontFamily: "var(--font-display), Georgia, serif" }}
                >
                  Delete “{pendingLabel}”?
                </h3>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  {pendingCount === 0
                    ? "This category has no recipes yet."
                    : pendingCount === 1
                      ? "1 recipe in this category will move to Other."
                      : `${pendingCount} recipes in this category will move to Other.`}
                </p>
                {error ? (
                  <p className="mt-3 text-sm font-semibold text-[var(--accent)]">
                    {error}
                  </p>
                ) : null}
                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setPendingDelete(null)}
                    className="rounded-xl px-3.5 py-2 text-sm font-semibold text-[var(--muted)] disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void confirmDelete()}
                    className="rounded-xl bg-[var(--danger)] px-3.5 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {busy ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarIcon } from "@/components/CalendarIcon";
import { StarIcon } from "@/components/FavouriteButton";
import { TimerIcon } from "@/components/RecipeTimers";
import { useRecipeTimers } from "@/components/RecipeTimersProvider";
import { saveOverlay } from "@/lib/save-overlay";
import { useSheetDismiss } from "@/lib/sheet-dismiss";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusables(root: HTMLElement) {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (el) =>
      !el.hasAttribute("disabled") &&
      el.tabIndex !== -1 &&
      el.getClientRects().length > 0,
  );
}

function EditIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 18 18"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M11.6 3.35a1.4 1.4 0 0 1 2 0l.95.95a1.4 1.4 0 0 1 0 2L7.1 13.75 3.5 14.5l.75-3.6 7.35-7.55Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M10.4 4.55 13.45 7.6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

const rowClass =
  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-[var(--ink)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] active:bg-[var(--chip)] lg:hover:bg-[var(--chip)]";

export function RecipeActionsSheet({
  recipeId,
  recipeTitle,
  favourited,
  planned,
  onCalendar,
  onEdit,
}: {
  recipeId: string;
  recipeTitle: string;
  favourited: boolean;
  planned: boolean;
  onCalendar: () => void;
  onEdit: () => void;
}) {
  const dialogId = useId();
  const titleId = useId();
  const { openSetup, timers } = useRecipeTimers();
  const live = timers.filter((t) => !t.ended).length;
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [favouriteOn, setFavouriteOn] = useState(favourited);
  const [favouriteBusy, setFavouriteBusy] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const pendingAction = useRef<(() => void) | null>(null);
  const { dragY, dragging, onPointerDown, onPointerMove, onPointerUp, onPointerCancel } =
    useSheetDismiss(dialogRef, open, () => setOpen(false));

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setFavouriteOn(favourited);
  }, [favourited]);

  useEffect(() => {
    if (!open) {
      const next = pendingAction.current;
      pendingAction.current = null;
      if (next) window.setTimeout(next, 0);
      return;
    }
    previousFocus.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => {
      const root = dialogRef.current;
      if (!root) return;
      const coarse = window.matchMedia("(pointer: coarse)").matches;
      if (coarse) {
        root.focus({ preventScroll: true });
      } else {
        focusables(root)[0]?.focus();
      }
    }, 50);

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const items = focusables(dialogRef.current);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !dialogRef.current.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (active === last || !dialogRef.current.contains(active))
      ) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      previousFocus.current?.focus();
    };
  }, [open]);

  function closeThen(action: () => void) {
    pendingAction.current = action;
    setOpen(false);
  }

  async function toggleFavourite() {
    if (favouriteBusy) return;
    const next = !favouriteOn;
    setFavouriteOn(next);
    setFavouriteBusy(true);
    setOpen(false);
    try {
      await saveOverlay(recipeId, { favourite: next });
    } catch {
      setFavouriteOn(!next);
    } finally {
      setFavouriteBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open ? "true" : "false"}
        aria-controls={dialogId}
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--muted)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] lg:hover:text-[var(--accent)]"
      >
        Actions
      </button>
      {mounted && open
        ? createPortal(
            <>
              <button
                type="button"
                tabIndex={-1}
                aria-label="Close"
                className="fixed inset-0 z-[45] bg-[var(--ink)]/40"
                onClick={() => setOpen(false)}
                style={
                  dragging
                    ? { opacity: Math.max(0.15, 1 - dragY / 280) }
                    : undefined
                }
              />
              <div
                ref={dialogRef}
                id={dialogId}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
                data-sheet-dragging={dragging ? "" : undefined}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerCancel}
                className="fixed z-[46] bg-[var(--card)] shadow-lg outline-none max-lg:inset-x-0 max-lg:bottom-0 max-lg:rounded-t-3xl max-lg:border-t max-lg:border-[var(--line)] max-lg:px-3 max-lg:pb-[max(1.25rem,env(safe-area-inset-bottom))] max-lg:pt-1 lg:left-1/2 lg:top-1/2 lg:w-full lg:max-w-sm lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-3xl lg:border lg:border-[var(--line)] lg:p-4"
                style={{
                  ...(dragY ? { transform: `translateY(${dragY}px)` } : null),
                  transition: dragging ? "none" : "transform 180ms",
                }}
              >
                <div
                  data-sheet-handle
                  className="flex h-11 w-full shrink-0 touch-none items-center justify-center lg:hidden"
                  style={{ touchAction: "none" }}
                >
                  <span className="h-1 w-10 rounded-full bg-[var(--line)]" />
                </div>
                <h2
                  id={titleId}
                  className="px-3 pb-1 text-lg font-medium tracking-tight lg:pt-0"
                  style={{ fontFamily: "var(--font-display), Georgia, serif" }}
                >
                  Actions
                </h2>
                <div className="flex flex-col">
                  <button
                    type="button"
                    disabled={favouriteBusy}
                    aria-pressed={favouriteOn}
                    aria-label={
                      favouriteOn
                        ? `Remove ${recipeTitle} from favourites`
                        : `Add ${recipeTitle} to favourites`
                    }
                    onClick={() => void toggleFavourite()}
                    className={rowClass}
                  >
                    <span
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--chip)] ${
                        favouriteOn ? "text-[var(--accent)]" : "text-[var(--ink)]"
                      }`}
                    >
                      <StarIcon filled={favouriteOn} size={16} />
                    </span>
                    {favouriteOn ? "Remove favourite" : "Favourite"}
                  </button>
                  <button
                    type="button"
                    onClick={() => closeThen(openSetup)}
                    className={rowClass}
                  >
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--chip)] text-[var(--ink)]">
                      <TimerIcon size={16} />
                    </span>
                    {live ? `Timer · ${live} running` : "Timer"}
                  </button>
                  <button
                    type="button"
                    aria-pressed={planned}
                    onClick={() => closeThen(onCalendar)}
                    className={rowClass}
                  >
                    <span
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--chip)] ${
                        planned ? "text-[var(--plan)]" : "text-[var(--ink)]"
                      }`}
                    >
                      <CalendarIcon size={16} />
                    </span>
                    {planned ? "Change calendar dates" : "Add to calendar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => closeThen(onEdit)}
                    className={rowClass}
                  >
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--chip)] text-[var(--ink)]">
                      <EditIcon />
                    </span>
                    Edit recipe
                  </button>
                </div>
              </div>
            </>,
            document.body,
          )
        : null}
    </>
  );
}

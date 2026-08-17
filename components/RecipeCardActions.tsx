"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  FavouriteButton,
  StarIcon,
  useHoldReveal,
} from "@/components/FavouriteButton";
import { saveOverlay } from "@/lib/save-overlay";
import type { Recipe } from "@/lib/types";

function BinIcon({ size = 16 }: { size?: number }) {
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

export function RecipeCardActions({
  recipe,
  onArchived,
  onFavouriteChange,
  children,
}: {
  recipe: Recipe;
  onArchived?: (id: string) => void;
  onFavouriteChange?: (id: string, favourite: boolean) => void;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { revealed, dismiss, holdHandlers } = useHoldReveal();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const favourited = Boolean(recipe.favourite);

  useEffect(() => {
    if (!revealed && !confirming) return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape" || busy) return;
      if (confirming) setConfirming(false);
      else dismiss();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [revealed, confirming, busy, dismiss]);

  function onClickCapture(e: React.MouseEvent) {
    holdHandlers.onClickCapture(e);
    if (e.defaultPrevented || !revealed) return;
    const target = e.target as Node;
    if (menuRef.current?.contains(target)) return;
    e.preventDefault();
    e.stopPropagation();
    dismiss();
  }

  function openConfirm(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setError(null);
    dismiss();
    setConfirming(true);
  }

  async function toggleFavourite(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    const next = !favourited;
    onFavouriteChange?.(recipe.id, next);
    dismiss();
    try {
      await saveOverlay(recipe.id, { favourite: next });
    } catch {
      onFavouriteChange?.(recipe.id, favourited);
    }
  }

  async function confirmDelete() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/recipes/${encodeURIComponent(recipe.id)}`, {
        method: "DELETE",
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        throw new Error(data?.error || "Could not delete recipe");
      }
      setConfirming(false);
      onArchived?.(recipe.id);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete recipe");
    } finally {
      setBusy(false);
    }
  }

  const hoverActions =
    "pointer-events-none opacity-0 lg:group-hover:pointer-events-auto lg:group-hover:opacity-100";

  return (
    <div
      className="group relative h-full w-full [-webkit-touch-callout:none] select-none"
      {...holdHandlers}
      onClickCapture={onClickCapture}
    >
      {revealed ? (
        <div
          className="fixed inset-0 z-40 bg-[var(--ink)]/35"
          aria-hidden="true"
        />
      ) : null}

      <div
        className={`relative h-full w-full transition-transform duration-150 ${
          revealed ? "z-50 scale-[1.03]" : ""
        }`}
      >
        {children}

        <div className="absolute right-2.5 top-2.5 z-10 hidden flex-row-reverse items-center gap-1 lg:flex">
          <FavouriteButton
            recipeId={recipe.id}
            recipeTitle={recipe.title}
            favourited={favourited}
            onChange={(next) => onFavouriteChange?.(recipe.id, next)}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--paper)]/90 text-[var(--ink)] shadow-sm backdrop-blur-sm transition-opacity focus-visible:pointer-events-auto focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${hoverActions}`}
          />
          <button
            type="button"
            onClick={openConfirm}
            aria-label={`Delete ${recipe.title}`}
            title="Delete recipe"
            className="pointer-events-none inline-flex h-9 w-0 items-center justify-center overflow-hidden rounded-full bg-[var(--paper)]/90 text-[var(--ink)] opacity-0 shadow-sm backdrop-blur-sm transition-[width,opacity] focus-visible:pointer-events-auto focus-visible:w-9 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-[var(--accent)] lg:group-hover:pointer-events-auto lg:group-hover:w-9 lg:group-hover:opacity-100"
          >
            <BinIcon />
          </button>
        </div>
      </div>

      {revealed ? (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Recipe actions"
          className="hold-pop absolute z-50 w-[min(calc(100%-1.5rem),15rem)] rounded-2xl border border-[var(--line)] bg-[var(--card)] p-1.5 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={toggleFavourite}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-[var(--ink)] active:bg-[var(--chip)]"
          >
            <span
              className={`inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--chip)] ${
                favourited ? "text-[var(--accent)]" : "text-[var(--ink)]"
              }`}
            >
              <StarIcon filled={favourited} size={16} />
            </span>
            {favourited ? "Remove favourite" : "Favourite"}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={openConfirm}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-[var(--ink)] active:bg-[var(--chip)]"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--chip)]">
              <BinIcon />
            </span>
            Delete
          </button>
        </div>
      ) : null}

      {confirming
        ? createPortal(
            <div
              className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--ink)]/40 p-4 sm:items-center"
              role="presentation"
              onClick={() => {
                if (!busy) setConfirming(false);
              }}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={`delete-recipe-${recipe.id}`}
                className="w-full max-w-sm rounded-2xl border border-[var(--line)] bg-[var(--card)] p-5 shadow-lg"
                onClick={(e) => e.stopPropagation()}
              >
                <h3
                  id={`delete-recipe-${recipe.id}`}
                  className="text-lg font-semibold"
                  style={{ fontFamily: "var(--font-display), Georgia, serif" }}
                >
                  Delete this recipe?
                </h3>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  “{recipe.title}” will be removed from your box.
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
                    onClick={() => setConfirming(false)}
                    className="rounded-xl px-3.5 py-2 text-sm font-semibold text-[var(--muted)] disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void confirmDelete()}
                    className="rounded-xl bg-[var(--accent)] px-3.5 py-2 text-sm font-semibold text-white disabled:opacity-50"
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

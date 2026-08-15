"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CookTimeDisplay } from "@/components/CookTimeDisplay";
import type { Recipe } from "@/lib/types";
import { PROTEIN_LABELS } from "@/lib/types";

const HOLD_MS = 500;

function BinIcon() {
  return (
    <svg
      width="16"
      height="16"
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

export function RecipeCard({
  recipe,
  onArchived,
}: {
  recipe: Recipe;
  onArchived?: (id: string) => void;
}) {
  const router = useRouter();
  const holdTimer = useRef<number | null>(null);
  const didHold = useRef(false);
  const [revealed, setRevealed] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (holdTimer.current != null) window.clearTimeout(holdTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!confirming) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) setConfirming(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirming, busy]);

  function clearHold() {
    if (holdTimer.current != null) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  }

  function onPointerDown(e: React.PointerEvent) {
    if (e.pointerType !== "touch") return;
    didHold.current = false;
    clearHold();
    holdTimer.current = window.setTimeout(() => {
      didHold.current = true;
      setRevealed(true);
    }, HOLD_MS);
  }

  function onPointerEnd() {
    clearHold();
  }

  function onClickCapture(e: React.MouseEvent) {
    if (!didHold.current) return;
    e.preventDefault();
    e.stopPropagation();
    didHold.current = false;
  }

  function openConfirm(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setError(null);
    setConfirming(true);
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

  const binVisible = revealed || confirming;

  const metaParts: string[] = [];
  if (recipe.nutrition) {
    metaParts.push(
      `${recipe.nutrition.kcal} kcal · ${recipe.nutrition.protein_g}g protein`,
    );
  } else if (recipe.tags.length > 0) {
    metaParts.push(recipe.tags.slice(0, 3).join(" · "));
  }
  if (recipe.highProtein) metaParts.push("high protein");

  return (
    <div
      className="group relative h-full w-full [-webkit-touch-callout:none] select-none"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onPointerLeave={onPointerEnd}
      onClickCapture={onClickCapture}
      onContextMenu={(e) => e.preventDefault()}
    >
      <Link
        href={`/recipe/${recipe.id}`}
        className="flex h-full gap-3 rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4 active:scale-[0.99] lg:transition-colors lg:hover:border-[var(--accent)]"
      >
        {recipe.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={recipe.imageUrl}
            alt=""
            draggable={false}
            className="h-16 w-16 shrink-0 self-center rounded-xl object-cover lg:h-20 lg:w-20"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h2
              className="line-clamp-2 min-h-[2.75em] text-[1.05rem] font-semibold leading-snug"
              style={{ fontFamily: "var(--font-display), Georgia, serif" }}
              title={recipe.title}
            >
              {recipe.title}
            </h2>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <span className="rounded-full bg-[var(--chip)] px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--sage)]">
                {PROTEIN_LABELS[recipe.protein]}
              </span>
              <CookTimeDisplay minutes={recipe.cookTimeMin} compact />
              {recipe.rating ? (
                <span className="text-xs font-semibold text-[var(--accent)]">
                  ★ {recipe.rating}/10
                </span>
              ) : null}
            </div>
          </div>
          <p
            className="mt-2 line-clamp-1 min-h-[1.25rem] text-sm text-[var(--muted)]"
            title={metaParts.join(" · ") || undefined}
          >
            {metaParts.join(" · ")}
          </p>
        </div>
      </Link>

      <button
        type="button"
        onClick={openConfirm}
        aria-label={`Delete ${recipe.title}`}
        title="Delete recipe"
        className={`absolute right-2.5 top-2.5 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--paper)]/90 text-[var(--ink)] shadow-sm backdrop-blur-sm transition-opacity focus-visible:opacity-100 focus-visible:pointer-events-auto focus-visible:ring-2 focus-visible:ring-[var(--accent)] lg:group-hover:pointer-events-auto lg:group-hover:opacity-100 ${
          binVisible
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
      >
        <BinIcon />
      </button>

      {confirming ? (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-[var(--ink)]/40 p-4 sm:items-center"
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
              <p className="mt-3 text-sm font-semibold text-[var(--accent)]">{error}</p>
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
        </div>
      ) : null}
    </div>
  );
}

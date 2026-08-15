"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RecipeCard } from "@/components/RecipeCard";
import { searchRecipes } from "@/lib/search";
import type { Allergen, Protein, Recipe } from "@/lib/types";
import { ALLERGEN_LABELS, ALLERGENS, PROTEIN_LABELS } from "@/lib/types";

const PROTEIN_CHIPS: Protein[] = [
  "chicken",
  "beef",
  "pork",
  "fish",
  "veggie",
  "dessert",
];

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((x) => x !== value)
    : [...list, value];
}

function FilterIcon() {
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
      <path d="M4 6h16M7 12h10M10 18h4" />
    </svg>
  );
}

export function RecipeSearch({ recipes }: { recipes: Recipe[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [proteins, setProteins] = useState<Protein[]>([]);
  const [avoidAllergens, setAvoidAllergens] = useState<Allergen[]>([]);
  const [allergyOpen, setAllergyOpen] = useState(false);
  const [archivedIds, setArchivedIds] = useState<string[]>([]);

  const results = useMemo(
    () =>
      searchRecipes(recipes, {
        query,
        proteins,
        dietary: [],
        avoidAllergens,
      }).filter((recipe) => !archivedIds.includes(recipe.id)),
    [recipes, query, proteins, avoidAllergens, archivedIds],
  );

  useEffect(() => {
    if (!allergyOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setAllergyOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [allergyOpen]);

  function onArchived(id: string) {
    setArchivedIds((ids) => (ids.includes(id) ? ids : [...ids, id]));
    router.refresh();
  }

  const allergyOn = avoidAllergens.length > 0;

  return (
    <div className="px-4 pt-5 lg:mx-auto lg:max-w-6xl lg:px-10 lg:pt-10">
      <header className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
          Personal box
        </p>
        <h1
          className="mt-1 text-3xl font-medium tracking-tight lg:text-4xl"
          style={{ fontFamily: "var(--font-display), Georgia, serif" }}
        >
          What are we cooking?
        </h1>
      </header>

      <div className="flex items-stretch gap-2 lg:max-w-xl">
        <label className="block min-w-0 flex-1">
          <span className="sr-only">Search recipes</span>
          <input
            type="search"
            enterKeyHint="search"
            placeholder="Ingredient, dish, leftover…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-2xl border border-[var(--line)] bg-[var(--card)] px-4 py-3.5 text-base outline-none ring-[var(--accent)] placeholder:text-[var(--muted)] focus:ring-2"
          />
        </label>
        <button
          type="button"
          aria-label={
            allergyOn
              ? `Allergy filters, ${avoidAllergens.length} selected`
              : "Allergy filters"
          }
          aria-expanded={allergyOpen}
          aria-controls="allergy-filter"
          onClick={() => setAllergyOpen((open) => !open)}
          className={`relative flex w-14 shrink-0 items-center justify-center rounded-2xl border outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
            allergyOn
              ? "border-[var(--sage)] bg-[var(--sage)] text-white"
              : allergyOpen
                ? "border-[var(--line)] bg-[var(--line)] text-[var(--ink)]"
                : "border-[var(--line)] bg-[var(--card)] text-[var(--ink)] lg:hover:bg-[var(--chip)]"
          }`}
        >
          <FilterIcon />
          {allergyOn && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[11px] font-bold leading-none text-white">
              {avoidAllergens.length}
            </span>
          )}
        </button>
      </div>

      {allergyOpen && (
        <div
          id="allergy-filter"
          className="mt-3 rounded-2xl border border-[var(--line)] bg-[var(--card)] px-4 py-3 lg:max-w-xl"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-[var(--muted)]">
              Only show recipes without these allergens
            </p>
            {allergyOn && (
              <button
                type="button"
                onClick={() => setAvoidAllergens([])}
                className="shrink-0 text-sm font-semibold text-[var(--accent)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              >
                Clear
              </button>
            )}
          </div>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {ALLERGENS.map((allergen) => {
              const on = avoidAllergens.includes(allergen);
              return (
                <button
                  key={allergen}
                  type="button"
                  onClick={() =>
                    setAvoidAllergens(toggle(avoidAllergens, allergen))
                  }
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                    on
                      ? "bg-[var(--sage)] text-white"
                      : "bg-[var(--chip)] text-[var(--ink)] lg:hover:bg-[var(--line)]"
                  }`}
                >
                  {ALLERGEN_LABELS[allergen]}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0">
        {PROTEIN_CHIPS.map((protein) => {
          const on = proteins.includes(protein);
          return (
            <button
              key={protein}
              type="button"
              onClick={() => setProteins(toggle(proteins, protein))}
              className={`shrink-0 rounded-full px-3.5 py-2 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                on
                  ? "bg-[var(--ink)] text-[var(--paper)]"
                  : "bg-[var(--chip)] text-[var(--ink)] lg:hover:bg-[var(--line)]"
              }`}
            >
              {PROTEIN_LABELS[protein]}
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-sm text-[var(--muted)]">
        {results.length} recipe{results.length === 1 ? "" : "s"}
      </p>

      <ul className="mt-3 space-y-3 lg:grid lg:grid-cols-2 lg:items-stretch lg:gap-4 lg:space-y-0 xl:grid-cols-3">
        {results.map((recipe) => (
          <li key={recipe.id}>
            <RecipeCard recipe={recipe} onArchived={onArchived} />
          </li>
        ))}
      </ul>

      {results.length === 0 && (
        <p className="mt-10 text-center text-[var(--muted)]">
          Nothing matches. Try a different ingredient or clear a filter.
        </p>
      )}
    </div>
  );
}

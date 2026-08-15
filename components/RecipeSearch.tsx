"use client";

import { useMemo, useState } from "react";
import { RecipeCard } from "@/components/RecipeCard";
import { searchRecipes } from "@/lib/search";
import type { DietaryFilter, Protein, Recipe } from "@/lib/types";
import { PROTEIN_LABELS } from "@/lib/types";

const PROTEIN_CHIPS: Protein[] = ["chicken", "beef", "pork", "fish", "veggie"];
const DIET_CHIPS: { id: DietaryFilter; label: string }[] = [
  { id: "high_protein", label: "High protein" },
  { id: "dairy_free", label: "Dairy-free" },
  { id: "gluten_free", label: "Gluten-free" },
  { id: "nut_free", label: "Nut-free" },
];

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((x) => x !== value)
    : [...list, value];
}

export function RecipeSearch({ recipes }: { recipes: Recipe[] }) {
  const [query, setQuery] = useState("");
  const [proteins, setProteins] = useState<Protein[]>([]);
  const [dietary, setDietary] = useState<DietaryFilter[]>([]);

  const results = useMemo(
    () => searchRecipes(recipes, { query, proteins, dietary }),
    [recipes, query, proteins, dietary],
  );

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

      <label className="block lg:max-w-xl">
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
        {DIET_CHIPS.map((chip) => {
          const on = dietary.includes(chip.id);
          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => setDietary(toggle(dietary, chip.id))}
              className={`shrink-0 rounded-full px-3.5 py-2 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                on
                  ? "bg-[var(--sage)] text-white"
                  : "bg-[var(--chip)] text-[var(--ink)] lg:hover:bg-[var(--line)]"
              }`}
            >
              {chip.label}
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
            <RecipeCard recipe={recipe} />
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

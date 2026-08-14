"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { qtyForServings } from "@/lib/filters";
import type { Recipe } from "@/lib/types";
import { ALLERGEN_LABELS, PROTEIN_LABELS } from "@/lib/types";

export function RecipeDetail({ recipe }: { recipe: Recipe }) {
  const [servings, setServings] = useState<2 | 3 | 4>(2);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const items = useMemo(
    () => [
      ...recipe.ingredients.map((i) => ({ ...i, pantry: false })),
      ...recipe.pantry.map((i) => ({ ...i, pantry: true })),
    ],
    [recipe],
  );

  function toggle(name: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  return (
    <article className="px-4 pb-8 pt-4">
      <Link
        href="/"
        className="text-sm font-semibold text-[var(--accent)]"
      >
        ← Recipes
      </Link>

      <h1
        className="mt-3 text-[1.75rem] font-medium leading-tight"
        style={{ fontFamily: "var(--font-display), Georgia, serif" }}
      >
        {recipe.title}
      </h1>

      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full bg-[var(--chip)] px-3 py-1 text-xs font-semibold uppercase tracking-wide">
          {PROTEIN_LABELS[recipe.protein]}
        </span>
        {recipe.highProtein && (
          <span className="rounded-full bg-[var(--sage)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
            High protein
          </span>
        )}
        {recipe.nutrition && (
          <span className="rounded-full bg-[var(--chip)] px-3 py-1 text-xs font-semibold">
            {recipe.nutrition.kcal} kcal · {recipe.nutrition.protein_g}g protein
          </span>
        )}
      </div>

      {recipe.allergens.length > 0 && (
        <p className="mt-3 text-sm text-[var(--muted)]">
          Contains{" "}
          {recipe.allergens.map((a) => ALLERGEN_LABELS[a]).join(", ")}
        </p>
      )}

      <section className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Ingredients</h2>
          <div className="flex overflow-hidden rounded-full border border-[var(--line)] bg-[var(--card)] text-sm font-semibold">
            {([2, 3, 4] as const).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setServings(n)}
                className={`px-3 py-1.5 ${
                  servings === n
                    ? "bg-[var(--ink)] text-[var(--paper)]"
                    : "text-[var(--muted)]"
                }`}
              >
                {n}p
              </button>
            ))}
          </div>
        </div>

        <ul className="mt-3 divide-y divide-[var(--line)]">
          {items.map((item) => {
            const on = checked.has(item.name);
            return (
              <li key={item.name}>
                <button
                  type="button"
                  onClick={() => toggle(item.name)}
                  className="flex w-full items-start gap-3 py-3 text-left"
                >
                  <span
                    className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border ${
                      on
                        ? "border-[var(--sage)] bg-[var(--sage)] text-white"
                        : "border-[var(--line)] bg-[var(--card)]"
                    }`}
                  >
                    {on ? "✓" : ""}
                  </span>
                  <span className={on ? "text-[var(--muted)] line-through" : ""}>
                    <span className="font-semibold">
                      {qtyForServings(item, servings)}
                    </span>{" "}
                    {item.name}
                    {item.pantry ? (
                      <span className="text-[var(--muted)]"> · pantry</span>
                    ) : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {recipe.tools.length > 0 && (
        <p className="mt-2 text-sm text-[var(--muted)]">
          Tools: {recipe.tools.join(", ")}
        </p>
      )}

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Steps</h2>
        <ol className="mt-3 space-y-5">
          {recipe.steps.map((step) => (
            <li key={step.n} className="flex gap-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--accent)] text-sm font-bold text-white">
                {step.n}
              </span>
              <div>
                <h3 className="font-semibold">{step.title}</h3>
                <p className="mt-1 text-[0.95rem] leading-relaxed text-[var(--ink)]/90">
                  {step.text}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </article>
  );
}

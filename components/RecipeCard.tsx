import Link from "next/link";
import type { Recipe } from "@/lib/types";
import { PROTEIN_LABELS } from "@/lib/types";

export function RecipeCard({ recipe }: { recipe: Recipe }) {
  return (
    <Link
      href={`/recipe/${recipe.id}`}
      className="block rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4 active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <h2
          className="text-[1.05rem] font-semibold leading-snug"
          style={{ fontFamily: "var(--font-display), Georgia, serif" }}
        >
          {recipe.title}
        </h2>
        <span className="shrink-0 rounded-full bg-[var(--chip)] px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--sage)]">
          {PROTEIN_LABELS[recipe.protein]}
        </span>
      </div>
      <p className="mt-2 text-sm text-[var(--muted)]">
        {recipe.nutrition
          ? `${recipe.nutrition.kcal} kcal · ${recipe.nutrition.protein_g}g protein`
          : recipe.tags.slice(0, 3).join(" · ")}
        {recipe.highProtein ? " · high protein" : ""}
      </p>
      <p className="mt-1 line-clamp-1 text-sm text-[var(--ink)]/80">
        {recipe.ingredients
          .slice(0, 4)
          .map((i) => i.name)
          .join(" · ")}
      </p>
    </Link>
  );
}

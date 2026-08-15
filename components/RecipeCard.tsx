import Link from "next/link";
import { formatCookTime } from "@/lib/format-time";
import type { Recipe } from "@/lib/types";
import { PROTEIN_LABELS } from "@/lib/types";

export function RecipeCard({ recipe }: { recipe: Recipe }) {
  const cookTimeLabel = formatCookTime(recipe.cookTimeMin);
  const metaParts: string[] = [];
  if (recipe.nutrition) {
    metaParts.push(
      `${recipe.nutrition.kcal} kcal · ${recipe.nutrition.protein_g}g protein`,
    );
  } else if (recipe.tags.length > 0) {
    metaParts.push(recipe.tags.slice(0, 3).join(" · "));
  }
  if (cookTimeLabel) metaParts.push(cookTimeLabel);
  if (recipe.highProtein) metaParts.push("high protein");

  return (
    <Link
      href={`/recipe/${recipe.id}`}
      className="flex gap-3 rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4 active:scale-[0.99] lg:h-full lg:transition-colors lg:hover:border-[var(--accent)]"
    >
      {recipe.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={recipe.imageUrl}
          alt=""
          className="h-16 w-16 shrink-0 rounded-xl object-cover lg:h-20 lg:w-20"
        />
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <h2
            className="text-[1.05rem] font-semibold leading-snug"
            style={{ fontFamily: "var(--font-display), Georgia, serif" }}
          >
            {recipe.title}
          </h2>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className="rounded-full bg-[var(--chip)] px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--sage)]">
              {PROTEIN_LABELS[recipe.protein]}
            </span>
            {recipe.rating ? (
              <span className="text-xs font-semibold text-[var(--accent)]">
                ★ {recipe.rating}/10
              </span>
            ) : null}
          </div>
        </div>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {metaParts.join(" · ")}
        </p>
        <p className="mt-1 line-clamp-1 text-sm text-[var(--ink)]/80">
          {recipe.ingredients
            .slice(0, 4)
            .map((i) => i.name)
            .join(" · ")}
        </p>
      </div>
    </Link>
  );
}

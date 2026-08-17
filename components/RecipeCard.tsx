"use client";

import Link from "next/link";
import { CardLinkPending } from "@/components/LinkPending";
import { RecipeCardActions } from "@/components/RecipeCardActions";
import { formatCookTime } from "@/lib/format-time";
import type { Recipe } from "@/lib/types";
import { useCategories } from "@/components/CategoriesProvider";

export function recipeCardClass(favourite: boolean, extra: string) {
  return `relative rounded-2xl border bg-[var(--card)] active:scale-[0.99] lg:transition-colors ${
    favourite
      ? "border-[var(--accent)] shadow-[0_0_0_1px_var(--accent)]"
      : "border-[var(--line)] lg:hover:border-[var(--accent)]"
  } ${extra}`;
}

export function TimeRating({
  minutes,
  rating,
}: {
  minutes: number | null | undefined;
  rating?: number | null;
}) {
  const cookTime = formatCookTime(minutes);
  if (!cookTime && !rating) return null;
  return (
    <span className="flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)]">
      {cookTime ? <span>{cookTime}</span> : null}
      {cookTime && rating ? (
        <span className="h-3 w-px bg-[var(--ink-faint)]" aria-hidden="true" />
      ) : null}
      {rating ? <span>{rating}/10</span> : null}
    </span>
  );
}

export function RecipeCard({
  recipe,
  onArchived,
  onFavouriteChange,
}: {
  recipe: Recipe;
  onArchived?: (id: string) => void;
  onFavouriteChange?: (id: string, favourite: boolean) => void;
}) {
  const { labelFor } = useCategories();
  const metaParts: string[] = [];
  if (recipe.nutrition) {
    metaParts.push(
      `${recipe.nutrition.kcal} kcal · ${recipe.nutrition.protein_g}g protein`,
    );
  } else if (recipe.tags.length > 0) {
    metaParts.push(recipe.tags.slice(0, 3).join(" · "));
  }
  if (recipe.highProtein) metaParts.push("high protein");

  const thumbUrl = recipe.originalImageUrl || recipe.imageUrl;

  return (
    <RecipeCardActions
      recipe={recipe}
      onArchived={onArchived}
      onFavouriteChange={onFavouriteChange}
    >
      <Link
        href={`/recipe/${recipe.id}`}
        className={recipeCardClass(
          Boolean(recipe.favourite),
          "flex h-full gap-3 p-4",
        )}
      >
        <CardLinkPending />
        {thumbUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbUrl}
            alt=""
            draggable="false"
            className="h-16 w-16 shrink-0 self-center rounded-xl object-cover [image-orientation:none] lg:h-20 lg:w-20"
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
                {labelFor(recipe.protein)}
              </span>
              <TimeRating minutes={recipe.cookTimeMin} rating={recipe.rating} />
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
    </RecipeCardActions>
  );
}

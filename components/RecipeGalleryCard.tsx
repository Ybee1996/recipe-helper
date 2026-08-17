"use client";

import Link from "next/link";
import {
  recipeCardClass,
  TimeRating,
} from "@/components/RecipeCard";
import { RecipeCardActions } from "@/components/RecipeCardActions";
import { recipePhotoUrl } from "@/lib/recipe-photo";
import type { Recipe } from "@/lib/types";
import { useCategories } from "@/components/CategoriesProvider";

export function RecipeGalleryCard({
  recipe,
  onArchived,
  onFavouriteChange,
}: {
  recipe: Recipe;
  onArchived?: (id: string) => void;
  onFavouriteChange?: (id: string, favourite: boolean) => void;
}) {
  const { labelFor } = useCategories();
  const photoUrl = recipePhotoUrl(recipe);
  if (!photoUrl) return null;

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
          "flex h-full w-full flex-col overflow-hidden",
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoUrl}
          alt={recipe.title}
          draggable="false"
          className="aspect-[16/9] w-full object-cover [image-orientation:none]"
        />
        <div className="flex items-start justify-between gap-3 p-4">
          <h2
            className="line-clamp-2 min-w-0 text-[1.05rem] font-semibold leading-snug"
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
      </Link>
    </RecipeCardActions>
  );
}

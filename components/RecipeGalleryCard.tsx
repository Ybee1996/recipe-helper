import Link from "next/link";
import { CookTimeDisplay } from "@/components/CookTimeDisplay";
import { recipePhotoUrl } from "@/lib/recipe-photo";
import type { Recipe } from "@/lib/types";
import { PROTEIN_LABELS } from "@/lib/types";

export function RecipeGalleryCard({ recipe }: { recipe: Recipe }) {
  const photoUrl = recipePhotoUrl(recipe);
  if (!photoUrl) return null;

  return (
    <Link
      href={`/recipe/${recipe.id}`}
      className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--card)] active:scale-[0.99] lg:transition-colors lg:hover:border-[var(--accent)]"
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
            {PROTEIN_LABELS[recipe.protein]}
          </span>
          <CookTimeDisplay minutes={recipe.cookTimeMin} compact />
        </div>
      </div>
    </Link>
  );
}

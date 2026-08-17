import type { Recipe } from "./types";

export function recipePhotoUrl(
  recipe: Pick<Recipe, "imageUrl" | "originalImageUrl">,
): string | null {
  return recipe.imageUrl || recipe.originalImageUrl || null;
}

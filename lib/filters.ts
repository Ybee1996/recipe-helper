import type { DietaryFilter, Recipe, SearchFilters } from "./types";

export function matchesDietary(recipe: Recipe, dietary: DietaryFilter): boolean {
  switch (dietary) {
    case "high_protein":
      return recipe.highProtein || (recipe.nutrition?.protein_g ?? 0) >= 30;
    case "dairy_free":
      return !recipe.allergens.includes("milk");
    case "gluten_free":
      return !recipe.allergens.includes("gluten");
    case "nut_free":
      return (
        !recipe.allergens.includes("peanut") &&
        !recipe.allergens.includes("tree_nut")
      );
    default:
      return true;
  }
}

export function applyFilters(
  recipes: Recipe[],
  filters: Pick<SearchFilters, "proteins" | "dietary">,
): Recipe[] {
  return recipes.filter((recipe) => {
    if (filters.proteins.length && !filters.proteins.includes(recipe.protein)) {
      return false;
    }
    return filters.dietary.every((d) => matchesDietary(recipe, d));
  });
}

export function qtyForServings(
  ingredient: { qty2: string; qty3?: string; qty4?: string },
  servings: 2 | 3 | 4,
): string {
  if (servings === 3) return ingredient.qty3 ?? ingredient.qty2;
  if (servings === 4) return ingredient.qty4 ?? ingredient.qty2;
  return ingredient.qty2;
}

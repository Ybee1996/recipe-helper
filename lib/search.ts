import MiniSearch from "minisearch";
import { applyFilters } from "./filters";
import type { Recipe, SearchFilters } from "./types";

export interface IndexedRecipe {
  id: string;
  title: string;
  protein: string;
  tags: string;
  ingredients: string;
  steps: string;
}

let index: MiniSearch<IndexedRecipe> | null = null;
let indexedIds: string | null = null;

function toDoc(recipe: Recipe): IndexedRecipe {
  return {
    id: recipe.id,
    title: recipe.title,
    protein: recipe.protein,
    tags: recipe.tags.join(" "),
    ingredients: [...recipe.ingredients, ...recipe.pantry]
      .map((i) => i.name)
      .join(" "),
    steps: recipe.steps.map((s) => `${s.title} ${s.text}`).join(" "),
  };
}

function getIndex(recipes: Recipe[]): MiniSearch<IndexedRecipe> {
  const key = recipes.map((r) => r.id).join(",");
  if (index && indexedIds === key) return index;

  const next = new MiniSearch<IndexedRecipe>({
    fields: ["title", "ingredients", "tags", "protein", "steps"],
    storeFields: ["id"],
    searchOptions: {
      boost: { title: 4, ingredients: 3, tags: 2, protein: 2, steps: 1 },
      fuzzy: 0.2,
      prefix: true,
    },
  });
  next.addAll(recipes.map(toDoc));
  index = next;
  indexedIds = key;
  return next;
}

export function searchRecipes(
  recipes: Recipe[],
  filters: SearchFilters,
): Recipe[] {
  const filtered = applyFilters(recipes, filters);
  const q = filters.query.trim();
  if (!q) return filtered;

  const hits = getIndex(filtered).search(q);
  if (!hits.length) {
    const needle = q.toLowerCase();
    return filtered.filter((r) => {
      const hay = [
        r.title,
        r.protein,
        ...r.tags,
        ...r.ingredients.map((i) => i.name),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }

  const byId = new Map(filtered.map((r) => [r.id, r]));
  return hits
    .map((h) => byId.get(h.id))
    .filter((r): r is Recipe => Boolean(r));
}

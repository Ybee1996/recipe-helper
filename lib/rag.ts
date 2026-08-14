import { applyFilters } from "./filters";
import type { DietaryFilter, Protein, Recipe } from "./types";

const PROTEIN_WORDS: Record<string, Protein> = {
  chicken: "chicken",
  beef: "beef",
  steak: "beef",
  mince: "beef",
  pork: "pork",
  fish: "fish",
  salmon: "fish",
  cod: "fish",
  tuna: "fish",
  prawn: "fish",
  seafood: "fish",
  veggie: "veggie",
  vegetarian: "veggie",
  vegan: "veggie",
  vegetable: "veggie",
};

const DIET_WORDS: { pattern: RegExp; filter: DietaryFilter }[] = [
  { pattern: /\bhigh[- ]?protein\b|\bprotein[- ]?smart\b/, filter: "high_protein" },
  { pattern: /\bno dairy\b|\bdairy[- ]?free\b|\blactose\b|\bno milk\b/, filter: "dairy_free" },
  { pattern: /\bgluten[- ]?free\b|\bno gluten\b|\bno (wheat|naan|pasta)\b/, filter: "gluten_free" },
  { pattern: /\bnut[- ]?free\b|\bno nuts?\b|\bno peanuts?\b/, filter: "nut_free" },
];

export function parseQueryIntent(query: string): {
  proteins: Protein[];
  dietary: DietaryFilter[];
  leftover: string;
} {
  const lower = query.toLowerCase();
  const proteins: Protein[] = [];
  const dietary: DietaryFilter[] = [];

  for (const [word, protein] of Object.entries(PROTEIN_WORDS)) {
    if (new RegExp(`\\b${word}\\b`).test(lower) && !proteins.includes(protein)) {
      proteins.push(protein);
    }
  }
  for (const { pattern, filter } of DIET_WORDS) {
    if (pattern.test(lower) && !dietary.includes(filter)) dietary.push(filter);
  }

  return { proteins, dietary, leftover: query };
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2);
}

function scoreRecipe(recipe: Recipe, tokens: string[]): number {
  const title = tokenize(recipe.title);
  const ingredients = tokenize(
    recipe.ingredients.map((i) => i.name).join(" "),
  );
  const tags = tokenize(recipe.tags.join(" "));
  const steps = tokenize(recipe.steps.map((s) => s.text).join(" "));
  let score = 0;
  for (const token of tokens) {
    if (title.includes(token)) score += 5;
    if (ingredients.includes(token)) score += 3;
    if (tags.includes(token)) score += 2;
    if (steps.includes(token)) score += 1;
    if (recipe.protein === token) score += 4;
  }
  return score;
}

export function retrieveRecipes(
  recipes: Recipe[],
  query: string,
  limit = 5,
): Recipe[] {
  const intent = parseQueryIntent(query);
  const filtered = applyFilters(recipes, {
    proteins: intent.proteins,
    dietary: intent.dietary,
  });
  const tokens = tokenize(intent.leftover);
  if (!tokens.length) return filtered.slice(0, limit);

  return [...filtered]
    .map((recipe) => ({ recipe, score: scoreRecipe(recipe, tokens) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.recipe);
}

export function compactRecipe(recipe: Recipe) {
  return {
    id: recipe.id,
    title: recipe.title,
    protein: recipe.protein,
    tags: recipe.tags,
    allergens: recipe.allergens,
    highProtein: recipe.highProtein,
    nutrition: recipe.nutrition
      ? {
          kcal: recipe.nutrition.kcal,
          protein_g: recipe.nutrition.protein_g,
        }
      : undefined,
    ingredients: recipe.ingredients.map((i) => `${i.qty2} ${i.name}`),
    pantry: recipe.pantry.map((i) => `${i.qty2} ${i.name}`),
    steps: recipe.steps.map((s) => `${s.n}. ${s.title}: ${s.text}`),
  };
}

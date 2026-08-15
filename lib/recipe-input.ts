import { ALLERGENS, PROTEINS } from "./types";
import type {
  Allergen,
  Ingredient,
  Protein,
  Recipe,
  Step,
} from "./types";
import { slugId } from "./recipes";

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function asProtein(value: unknown): Protein {
  const raw = asString(value).toLowerCase();
  return (PROTEINS as readonly string[]).includes(raw) ? (raw as Protein) : "other";
}

function asAllergens(value: unknown): Allergen[] {
  if (!Array.isArray(value)) return [];
  const allowed = new Set<string>(ALLERGENS);
  const out: Allergen[] = [];
  for (const item of value) {
    const key = asString(item);
    if (allowed.has(key) && !out.includes(key as Allergen)) out.push(key as Allergen);
  }
  return out;
}

function asIngredients(value: unknown): Ingredient[] {
  if (!Array.isArray(value)) return [];
  const out: Ingredient[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const raw = item as Ingredient;
    const name = asString(raw.name);
    if (!name) continue;
    const ingredient: Ingredient = { name, qty2: asString(raw.qty2) };
    if (asString(raw.qty3)) ingredient.qty3 = asString(raw.qty3);
    if (asString(raw.qty4)) ingredient.qty4 = asString(raw.qty4);
    if (raw.pantry) ingredient.pantry = true;
    out.push(ingredient);
  }
  return out;
}

function asSteps(value: unknown): Step[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, i) => {
      if (!item || typeof item !== "object") return null;
      const raw = item as Step;
      const title = asString(raw.title) || `Step ${i + 1}`;
      const text = asString(raw.text);
      if (!title && !text) return null;
      return { n: i + 1, title, text };
    })
    .filter((s): s is Step => s !== null);
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => asString(v)).filter(Boolean);
}

function asNutrition(value: unknown): Recipe["nutrition"] | undefined {
  if (!value || typeof value !== "object") return undefined;
  const n = value as Record<string, unknown>;
  const kcal = asNumber(n.kcal);
  const fat_g = asNumber(n.fat_g);
  const carbs_g = asNumber(n.carbs_g);
  const protein_g = asNumber(n.protein_g);
  if (kcal == null || fat_g == null || carbs_g == null || protein_g == null) {
    return undefined;
  }
  return {
    kcal,
    fat_g,
    carbs_g,
    protein_g,
    kj: asNumber(n.kj),
    sat_fat_g: asNumber(n.sat_fat_g),
    sugars_g: asNumber(n.sugars_g),
    salt_g: asNumber(n.salt_g),
  };
}

export function parseIngredientLines(text: string): Ingredient[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(\d[\w./-]*|[½¼¾])\s+(.+)$/);
      if (match) return { name: match[2].trim(), qty2: match[1] };
      return { name: line, qty2: "" };
    });
}

export function parseStepLines(text: string): Step[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, i) => {
      const split = line.match(/^([^:]{1,40}):\s*(.+)$/);
      if (split) return { n: i + 1, title: split[1].trim(), text: split[2].trim() };
      return { n: i + 1, title: `Step ${i + 1}`, text: line };
    });
}

export function recipeFromExtract(raw: Record<string, unknown>, sourceUrl: string): Recipe | null {
  const title = asString(raw.title);
  if (!title) return null;
  const nutrition = asNutrition(raw.nutrition);
  const proteinG = nutrition?.protein_g ?? 0;
  const id = asString(raw.id) || slugId(title);
  return {
    id: id.startsWith("web-") ? id : slugId(title),
    title,
    source: "web",
    sourceUrl,
    protein: asProtein(raw.protein),
    cookTimeMin: asNumber(raw.cookTimeMin) ?? null,
    servings: asNumber(raw.servings) || 2,
    tags: asStringList(raw.tags),
    allergens: asAllergens(raw.allergens),
    ingredients: asIngredients(raw.ingredients),
    pantry: asIngredients(raw.pantry),
    tools: asStringList(raw.tools),
    steps: asSteps(raw.steps),
    nutrition,
    highProtein: Boolean(raw.highProtein) || proteinG >= 30,
  };
}

export function recipeFromManual(input: {
  title: string;
  protein: Protein;
  cookTimeMin?: number | null;
  ingredientsText: string;
  stepsText: string;
}): Recipe {
  const title = input.title.trim();
  return {
    id: slugId(title),
    title,
    source: "web",
    protein: input.protein,
    cookTimeMin: input.cookTimeMin ?? null,
    servings: 2,
    tags: [],
    allergens: [],
    ingredients: parseIngredientLines(input.ingredientsText),
    pantry: [],
    tools: [],
    steps: parseStepLines(input.stepsText),
    highProtein: false,
  };
}

export function recipeFromClient(raw: Record<string, unknown>): Recipe | null {
  const title = asString(raw.title);
  if (!title) return null;
  const nutrition = asNutrition(raw.nutrition);
  const proteinG = nutrition?.protein_g ?? 0;
  const sourceUrl = asString(raw.sourceUrl) || undefined;

  return {
    id: slugId(title),
    title,
    source: "web",
    sourceUrl,
    protein: asProtein(raw.protein),
    cookTimeMin: asNumber(raw.cookTimeMin) ?? null,
    servings: asNumber(raw.servings) || 2,
    tags: asStringList(raw.tags),
    allergens: asAllergens(raw.allergens),
    ingredients: asIngredients(raw.ingredients),
    pantry: asIngredients(raw.pantry),
    tools: asStringList(raw.tools),
    steps: asSteps(raw.steps),
    nutrition,
    highProtein: Boolean(raw.highProtein) || proteinG >= 30,
  };
}

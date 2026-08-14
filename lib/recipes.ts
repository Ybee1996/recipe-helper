import type { Protein, Recipe, RecipeSource, UserRecipeOverlay } from "./types";
import { PROTEINS } from "./types";
import { getSql } from "./db";
import { parseOverlay } from "./user-store";

export type RecipeRow = {
  id: string;
  title: string;
  protein: string;
  source: string;
  data: unknown;
  overlay: unknown;
};

export function isRecipe(value: unknown): value is Recipe {
  if (!value || typeof value !== "object") return false;
  const r = value as Recipe;
  return typeof r.id === "string" && typeof r.title === "string";
}

export function isProtein(value: unknown): value is Protein {
  return typeof value === "string" && (PROTEINS as readonly string[]).includes(value);
}

export function slugId(text: string, prefix = "web"): string {
  const slug =
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "recipe";
  return `${prefix}-${slug}`;
}

export function toStoredData(
  recipe: Recipe,
): Omit<Recipe, "rating" | "note" | "imageUrl"> {
  const { rating: _rating, note: _note, imageUrl: _imageUrl, ...data } = recipe;
  return data;
}

export function applyOverlay(recipe: Recipe, overlay?: UserRecipeOverlay): Recipe {
  if (!overlay) return recipe;
  return {
    ...recipe,
    rating: overlay.rating ?? null,
    note: overlay.note ?? null,
    imageUrl: overlay.imageUrl ?? null,
    protein: overlay.protein ?? recipe.protein,
    ingredients: overlay.ingredients ?? recipe.ingredients,
    pantry: overlay.pantry ?? recipe.pantry,
    steps: overlay.steps ?? recipe.steps,
  };
}

function rowToRecipe(row: RecipeRow): Recipe | null {
  if (!isRecipe(row.data)) return null;
  const data = row.data;
  const source: RecipeSource = data.source === "hellofresh" ? "hellofresh" : "web";
  const recipe: Recipe = {
    ...data,
    id: row.id,
    title: row.title,
    protein: isProtein(row.protein) ? row.protein : data.protein,
    source,
    highProtein: data.highProtein || (data.nutrition?.protein_g ?? 0) >= 30,
    ingredients: data.ingredients ?? [],
    pantry: data.pantry ?? [],
    tools: data.tools ?? [],
    steps: data.steps ?? [],
    tags: data.tags ?? [],
    allergens: data.allergens ?? [],
    servings: data.servings || 2,
  };
  return applyOverlay(recipe, parseOverlay(row.overlay) ?? undefined);
}

export async function loadRecipes(): Promise<Recipe[]> {
  const sql = getSql();
  const rows = (await sql`
    SELECT id, title, protein, source, data, overlay
    FROM recipes
    ORDER BY title
  `) as RecipeRow[];
  const recipes: Recipe[] = [];
  for (const row of rows) {
    const recipe = rowToRecipe(row);
    if (recipe) recipes.push(recipe);
  }
  return recipes;
}

export async function getRecipe(id: string): Promise<Recipe | undefined> {
  const sql = getSql();
  const rows = (await sql`
    SELECT id, title, protein, source, data, overlay
    FROM recipes
    WHERE id = ${id}
  `) as RecipeRow[];
  if (!rows[0]) return undefined;
  return rowToRecipe(rows[0]) ?? undefined;
}

export async function insertRecipe(recipe: Recipe): Promise<"ok" | "conflict"> {
  const existing = await getRecipe(recipe.id);
  if (existing) return "conflict";
  const sql = getSql();
  const data = toStoredData(recipe);
  await sql`
    INSERT INTO recipes (id, title, protein, source, data, overlay, updated_at)
    VALUES (
      ${recipe.id},
      ${recipe.title},
      ${recipe.protein},
      ${recipe.source},
      ${JSON.stringify(data)}::jsonb,
      '{}'::jsonb,
      now()
    )
  `;
  return "ok";
}

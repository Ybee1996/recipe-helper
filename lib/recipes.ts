import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Recipe } from "./types";

const RECIPES_DIR = path.join(process.cwd(), "data", "recipes");

let cache: Recipe[] | null = null;

function isRecipe(value: unknown): value is Recipe {
  if (!value || typeof value !== "object") return false;
  const r = value as Recipe;
  return typeof r.id === "string" && typeof r.title === "string";
}

export function loadRecipes(): Recipe[] {
  if (cache && process.env.NODE_ENV !== "development") return cache;
  const files = readdirSync(RECIPES_DIR).filter((f) => f.endsWith(".json"));
  const recipes: Recipe[] = [];
  const seen = new Set<string>();

  for (const file of files) {
    const raw = readFileSync(path.join(RECIPES_DIR, file), "utf8");
    const parsed = JSON.parse(raw) as unknown;
    const list = Array.isArray(parsed) ? parsed : [parsed];
    for (const item of list) {
      if (!isRecipe(item) || seen.has(item.id)) continue;
      seen.add(item.id);
      recipes.push({
        ...item,
        highProtein:
          item.highProtein || (item.nutrition?.protein_g ?? 0) >= 30,
      });
    }
  }

  recipes.sort((a, b) => a.title.localeCompare(b.title));
  cache = recipes;
  return recipes;
}

export function getRecipe(id: string): Recipe | undefined {
  return loadRecipes().find((r) => r.id === id);
}

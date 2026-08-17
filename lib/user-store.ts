import type { Ingredient, Protein, Step, UserRecipeOverlay } from "./types";
import { isProtein } from "./types";
import { getSql } from "./db";

export type OverlayMap = Record<string, UserRecipeOverlay>;

function isIngredient(value: unknown): value is Ingredient {
  if (!value || typeof value !== "object") return false;
  const i = value as Ingredient;
  return typeof i.name === "string" && typeof i.qty2 === "string";
}

function isStep(value: unknown): value is Step {
  if (!value || typeof value !== "object") return false;
  const s = value as Step;
  return (
    typeof s.n === "number" &&
    typeof s.title === "string" &&
    typeof s.text === "string"
  );
}

export function parseOverlay(value: unknown): UserRecipeOverlay | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as UserRecipeOverlay;
  const overlay: UserRecipeOverlay = {};

  if (raw.rating === null) overlay.rating = null;
  else if (
    typeof raw.rating === "number" &&
    Number.isInteger(raw.rating) &&
    raw.rating >= 1 &&
    raw.rating <= 10
  ) {
    overlay.rating = raw.rating;
  }

  if (raw.note === null) overlay.note = null;
  else if (typeof raw.note === "string") overlay.note = raw.note;

  if (raw.imageUrl === null) overlay.imageUrl = null;
  else if (typeof raw.imageUrl === "string" && /^https?:\/\//.test(raw.imageUrl)) {
    overlay.imageUrl = raw.imageUrl;
  }

  if (raw.originalImageUrl === null) overlay.originalImageUrl = null;
  else if (
    typeof raw.originalImageUrl === "string" &&
    /^https?:\/\//.test(raw.originalImageUrl)
  ) {
    overlay.originalImageUrl = raw.originalImageUrl;
  }

  if (Array.isArray(raw.ingredients) && raw.ingredients.every(isIngredient)) {
    overlay.ingredients = raw.ingredients;
  }
  if (Array.isArray(raw.pantry) && raw.pantry.every(isIngredient)) {
    overlay.pantry = raw.pantry;
  }
  if (Array.isArray(raw.steps) && raw.steps.every(isStep)) {
    overlay.steps = raw.steps.map((s, i) => ({ ...s, n: i + 1 }));
  }
  if (isProtein(raw.protein)) {
    overlay.protein = raw.protein as Protein;
  }
  if (raw.cookTimeMin === null) overlay.cookTimeMin = null;
  else if (
    typeof raw.cookTimeMin === "number" &&
    Number.isFinite(raw.cookTimeMin) &&
    raw.cookTimeMin >= 0
  ) {
    overlay.cookTimeMin = Math.round(raw.cookTimeMin);
  }
  if (
    typeof raw.servings === "number" &&
    Number.isInteger(raw.servings) &&
    raw.servings >= 1
  ) {
    overlay.servings = raw.servings;
  }
  if (typeof raw.title === "string" && raw.title.trim()) {
    overlay.title = raw.title.trim();
  }
  if (raw.favourite === true) overlay.favourite = true;
  if (raw.pinned === true) overlay.pinned = true;
  if (typeof raw.updatedAt === "string") overlay.updatedAt = raw.updatedAt;
  return overlay;
}

export function overlayIsEmpty(overlay: UserRecipeOverlay): boolean {
  return (
    overlay.rating == null &&
    !overlay.note &&
    !overlay.imageUrl &&
    !overlay.originalImageUrl &&
    overlay.ingredients === undefined &&
    overlay.pantry === undefined &&
    overlay.steps === undefined &&
    overlay.protein === undefined &&
    overlay.cookTimeMin === undefined &&
    overlay.servings === undefined &&
    !overlay.title &&
    !overlay.favourite &&
    !overlay.pinned
  );
}

export async function loadOverlays(): Promise<OverlayMap> {
  const sql = getSql();
  const rows = (await sql`
    SELECT id, overlay FROM recipes
    WHERE overlay <> '{}'::jsonb
  `) as { id: string; overlay: unknown }[];
  const out: OverlayMap = {};
  for (const row of rows) {
    const overlay = parseOverlay(row.overlay);
    if (overlay && !overlayIsEmpty(overlay)) out[row.id] = overlay;
  }
  return out;
}

export async function getOverlay(id: string): Promise<UserRecipeOverlay> {
  const sql = getSql();
  const rows = (await sql`
    SELECT overlay FROM recipes WHERE id = ${id}
  `) as { overlay: unknown }[];
  return parseOverlay(rows[0]?.overlay) ?? {};
}

export async function patchOverlay(
  id: string,
  patch: UserRecipeOverlay,
): Promise<UserRecipeOverlay> {
  const sql = getSql();
  const rows = (await sql`
    SELECT overlay FROM recipes WHERE id = ${id}
  `) as { overlay: unknown }[];
  if (!rows[0]) {
    throw new Error("Recipe not found");
  }

  const current = parseOverlay(rows[0].overlay) ?? {};
  const next: UserRecipeOverlay = { ...current, updatedAt: new Date().toISOString() };

  if ("title" in patch) {
    if (!patch.title?.trim()) delete next.title;
    else next.title = patch.title.trim();
  }
  if ("rating" in patch) {
    if (patch.rating === null) delete next.rating;
    else next.rating = patch.rating;
  }
  if ("note" in patch) {
    if (patch.note === null || patch.note === "") delete next.note;
    else next.note = patch.note;
  }
  if ("imageUrl" in patch) {
    if (patch.imageUrl === null || patch.imageUrl === "") delete next.imageUrl;
    else next.imageUrl = patch.imageUrl;
  }
  if ("originalImageUrl" in patch) {
    if (patch.originalImageUrl === null || patch.originalImageUrl === "") {
      delete next.originalImageUrl;
    } else next.originalImageUrl = patch.originalImageUrl;
  }
  if ("ingredients" in patch) next.ingredients = patch.ingredients;
  if ("pantry" in patch) next.pantry = patch.pantry;
  if ("steps" in patch) {
    next.steps = (patch.steps ?? []).map((s, i) => ({ ...s, n: i + 1 }));
  }
  if ("protein" in patch) {
    if (patch.protein === undefined) delete next.protein;
    else next.protein = patch.protein;
  }
  if ("cookTimeMin" in patch) {
    if (patch.cookTimeMin === null) delete next.cookTimeMin;
    else next.cookTimeMin = patch.cookTimeMin;
  }
  if ("servings" in patch) {
    if (patch.servings === undefined) delete next.servings;
    else next.servings = patch.servings;
  }
  if ("favourite" in patch) {
    if (patch.favourite) next.favourite = true;
    else delete next.favourite;
  }
  if ("pinned" in patch) {
    if (patch.pinned) next.pinned = true;
    else delete next.pinned;
  }

  const stored = overlayIsEmpty(next) ? {} : next;
  const titleUpdate = "title" in patch && patch.title?.trim();
  const proteinUpdate = "protein" in patch && patch.protein;
  if (titleUpdate && proteinUpdate) {
    await sql`
      UPDATE recipes
      SET overlay = ${JSON.stringify(stored)}::jsonb,
          title = ${patch.title!.trim()},
          protein = ${patch.protein!},
          updated_at = now()
      WHERE id = ${id}
    `;
  } else if (titleUpdate) {
    await sql`
      UPDATE recipes
      SET overlay = ${JSON.stringify(stored)}::jsonb,
          title = ${patch.title!.trim()},
          updated_at = now()
      WHERE id = ${id}
    `;
  } else if (proteinUpdate) {
    await sql`
      UPDATE recipes
      SET overlay = ${JSON.stringify(stored)}::jsonb,
          protein = ${patch.protein!},
          updated_at = now()
      WHERE id = ${id}
    `;
  } else {
    await sql`
      UPDATE recipes
      SET overlay = ${JSON.stringify(stored)}::jsonb, updated_at = now()
      WHERE id = ${id}
    `;
  }
  return overlayIsEmpty(next) ? {} : next;
}

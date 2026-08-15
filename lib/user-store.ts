import type { Ingredient, Protein, Step, UserRecipeOverlay } from "./types";
import { PROTEINS } from "./types";
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

  if (Array.isArray(raw.ingredients) && raw.ingredients.every(isIngredient)) {
    overlay.ingredients = raw.ingredients;
  }
  if (Array.isArray(raw.pantry) && raw.pantry.every(isIngredient)) {
    overlay.pantry = raw.pantry;
  }
  if (Array.isArray(raw.steps) && raw.steps.every(isStep)) {
    overlay.steps = raw.steps.map((s, i) => ({ ...s, n: i + 1 }));
  }
  if (
    typeof raw.protein === "string" &&
    (PROTEINS as readonly string[]).includes(raw.protein)
  ) {
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
  if (typeof raw.updatedAt === "string") overlay.updatedAt = raw.updatedAt;
  return overlay;
}

export function overlayIsEmpty(overlay: UserRecipeOverlay): boolean {
  return (
    overlay.rating == null &&
    !overlay.note &&
    !overlay.imageUrl &&
    overlay.ingredients === undefined &&
    overlay.pantry === undefined &&
    overlay.steps === undefined &&
    overlay.protein === undefined &&
    overlay.cookTimeMin === undefined
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

  const stored = overlayIsEmpty(next) ? {} : next;
  if ("protein" in patch && patch.protein) {
    await sql`
      UPDATE recipes
      SET overlay = ${JSON.stringify(stored)}::jsonb,
          protein = ${patch.protein},
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

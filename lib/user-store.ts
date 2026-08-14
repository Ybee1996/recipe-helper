import type { Ingredient, Step, UserRecipeOverlay } from "./types";
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

  if (Array.isArray(raw.ingredients) && raw.ingredients.every(isIngredient)) {
    overlay.ingredients = raw.ingredients;
  }
  if (Array.isArray(raw.pantry) && raw.pantry.every(isIngredient)) {
    overlay.pantry = raw.pantry;
  }
  if (Array.isArray(raw.steps) && raw.steps.every(isStep)) {
    overlay.steps = raw.steps.map((s, i) => ({ ...s, n: i + 1 }));
  }
  if (typeof raw.updatedAt === "string") overlay.updatedAt = raw.updatedAt;
  return overlay;
}

export function overlayIsEmpty(overlay: UserRecipeOverlay): boolean {
  return (
    overlay.rating == null &&
    !overlay.note &&
    overlay.ingredients === undefined &&
    overlay.pantry === undefined &&
    overlay.steps === undefined
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
  if ("ingredients" in patch) next.ingredients = patch.ingredients;
  if ("pantry" in patch) next.pantry = patch.pantry;
  if ("steps" in patch) {
    next.steps = (patch.steps ?? []).map((s, i) => ({ ...s, n: i + 1 }));
  }

  const stored = overlayIsEmpty(next) ? {} : next;
  await sql`
    UPDATE recipes
    SET overlay = ${JSON.stringify(stored)}::jsonb, updated_at = now()
    WHERE id = ${id}
  `;
  return overlayIsEmpty(next) ? {} : next;
}

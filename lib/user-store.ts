import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Ingredient, Step, UserRecipeOverlay } from "./types";

const USER_FILE = path.join(process.cwd(), "data", "user.json");

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

function parseOverlay(value: unknown): UserRecipeOverlay | null {
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

export function loadOverlays(): OverlayMap {
  if (!existsSync(USER_FILE)) return {};
  try {
    const parsed = JSON.parse(readFileSync(USER_FILE, "utf8")) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: OverlayMap = {};
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      const overlay = parseOverlay(value);
      if (overlay) out[id] = overlay;
    }
    return out;
  } catch {
    return {};
  }
}

export function saveOverlays(map: OverlayMap): void {
  mkdirSync(path.dirname(USER_FILE), { recursive: true });
  const tmp = `${USER_FILE}.tmp`;
  writeFileSync(tmp, JSON.stringify(map, null, 2) + "\n", "utf8");
  renameSync(tmp, USER_FILE);
}

export function patchOverlay(
  id: string,
  patch: UserRecipeOverlay,
): UserRecipeOverlay {
  const map = loadOverlays();
  const current = map[id] ?? {};
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

  const empty =
    next.rating == null &&
    !next.note &&
    next.ingredients === undefined &&
    next.pantry === undefined &&
    next.steps === undefined;
  if (empty) delete map[id];
  else map[id] = next;

  saveOverlays(map);
  return next;
}

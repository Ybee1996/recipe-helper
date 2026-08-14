import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import { loadEnv } from "./load-env";
import { isRecipe, toStoredData } from "../lib/recipes";
import { overlayIsEmpty, parseOverlay } from "../lib/user-store";
import type { OverlayMap } from "../lib/user-store";

loadEnv();

const ROOT = process.cwd();
const RECIPES_DIR = path.join(ROOT, "data", "recipes");
const USER_FILE = path.join(ROOT, "data", "user.json");

function loadSourceRecipes() {
  const files = readdirSync(RECIPES_DIR).filter((f) => f.endsWith(".json"));
  const recipes = [];
  const seen = new Set<string>();

  for (const file of files) {
    const parsed = JSON.parse(
      readFileSync(path.join(RECIPES_DIR, file), "utf8"),
    ) as unknown;
    const list = Array.isArray(parsed) ? parsed : [parsed];
    for (const item of list) {
      if (!isRecipe(item) || seen.has(item.id)) continue;
      seen.add(item.id);
      recipes.push({
        ...item,
        highProtein: item.highProtein || (item.nutrition?.protein_g ?? 0) >= 30,
      });
    }
  }
  return recipes;
}

function loadFileOverlays(): OverlayMap {
  if (!existsSync(USER_FILE)) return {};
  try {
    const parsed = JSON.parse(readFileSync(USER_FILE, "utf8")) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: OverlayMap = {};
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      const overlay = parseOverlay(value);
      if (overlay && !overlayIsEmpty(overlay)) out[id] = overlay;
    }
    return out;
  } catch {
    return {};
  }
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("Set DATABASE_URL in .env.local");
    process.exit(1);
  }

  const sql = neon(url);
  const overlays = loadFileOverlays();
  const recipes = loadSourceRecipes();
  let upserted = 0;

  for (const recipe of recipes) {
    const data = toStoredData(recipe);
    const overlay = overlays[recipe.id] ?? {};
    const overlayJson = JSON.stringify(overlay);
    await sql`
      INSERT INTO recipes (id, title, protein, source, data, overlay, updated_at)
      VALUES (
        ${recipe.id},
        ${recipe.title},
        ${recipe.protein},
        ${recipe.source},
        ${JSON.stringify(data)}::jsonb,
        ${overlayJson}::jsonb,
        now()
      )
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        protein = EXCLUDED.protein,
        source = EXCLUDED.source,
        data = EXCLUDED.data,
        overlay = CASE
          WHEN recipes.overlay <> '{}'::jsonb THEN recipes.overlay
          ELSE EXCLUDED.overlay
        END,
        updated_at = now()
    `;
    upserted += 1;
  }

  console.log(`seeded ${upserted} recipes (${Object.keys(overlays).length} overlays from user.json)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

import { getSql } from "./db";
import {
  cookDateFromDb,
  isCalendarDate,
  type CalendarEntry,
  type CalendarOp,
  type CalendarRecipeOption,
} from "./calendar";
import { parseOverlay } from "./user-store";

type CalendarRow = {
  id: string;
  recipe_id: string;
  cook_date: unknown;
  title: string;
  overlay: unknown;
  data: unknown;
};

type RecipeRow = {
  id: string;
  title: string;
  overlay: unknown;
  data: unknown;
};

let tableReady = false;

async function ensureCalendarTable() {
  if (tableReady) return;
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS calendar_entries (
      id text PRIMARY KEY,
      recipe_id text NOT NULL,
      cook_date date NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (recipe_id, cook_date)
    )
  `;
  await sql`ALTER TABLE recipes ADD COLUMN IF NOT EXISTS archived_at timestamptz`;
  tableReady = true;
}

function imageFromRecipe(overlay: unknown, data: unknown): string | null {
  const parsed = parseOverlay(overlay);
  if (parsed?.originalImageUrl) return parsed.originalImageUrl;
  if (parsed?.imageUrl) return parsed.imageUrl;
  if (data && typeof data === "object") {
    const raw = data as { originalImageUrl?: unknown; imageUrl?: unknown };
    if (typeof raw.originalImageUrl === "string") return raw.originalImageUrl;
    if (typeof raw.imageUrl === "string") return raw.imageUrl;
  }
  return null;
}

function rowToEntry(row: CalendarRow): CalendarEntry | null {
  const cookDate = cookDateFromDb(row.cook_date);
  if (!cookDate) return null;
  return {
    id: row.id,
    recipeId: row.recipe_id,
    cookDate,
    title: row.title,
    imageUrl: imageFromRecipe(row.overlay, row.data),
  };
}

function rowToRecipe(row: RecipeRow): CalendarRecipeOption {
  return {
    id: row.id,
    title: row.title,
    imageUrl: imageFromRecipe(row.overlay, row.data),
  };
}

export async function loadCalendarRecipes(): Promise<CalendarRecipeOption[]> {
  await ensureCalendarTable();
  const sql = getSql();
  const rows = (await sql`
    SELECT id, title, overlay, data
    FROM recipes
    WHERE archived_at IS NULL
    ORDER BY title
  `) as RecipeRow[];
  return rows.map(rowToRecipe);
}

export async function loadCalendarEntries(): Promise<CalendarEntry[]> {
  await ensureCalendarTable();
  const sql = getSql();
  const rows = (await sql`
    SELECT e.id, e.recipe_id, to_char(e.cook_date, 'YYYY-MM-DD') AS cook_date,
           r.title, r.overlay, r.data
    FROM calendar_entries e
    JOIN recipes r ON r.id = e.recipe_id
    WHERE r.archived_at IS NULL
    ORDER BY e.cook_date ASC, e.created_at ASC, e.id ASC
  `) as CalendarRow[];
  return rows.map(rowToEntry).filter((entry): entry is CalendarEntry => Boolean(entry));
}

export async function loadCalendar(): Promise<{
  entries: CalendarEntry[];
  recipes: CalendarRecipeOption[];
}> {
  const [entries, recipes] = await Promise.all([
    loadCalendarEntries(),
    loadCalendarRecipes(),
  ]);
  return { entries, recipes };
}

export async function deleteCalendarEntriesForRecipe(recipeId: string): Promise<void> {
  await ensureCalendarTable();
  const sql = getSql();
  await sql`DELETE FROM calendar_entries WHERE recipe_id = ${recipeId}`;
}

export async function applyCalendarOp(op: CalendarOp): Promise<{
  entries: CalendarEntry[];
  recipes: CalendarRecipeOption[];
}> {
  await ensureCalendarTable();
  const sql = getSql();

  switch (op.op) {
    case "add": {
      if (!isCalendarDate(op.entry.cookDate) || !op.entry.recipeId) break;
      const existing = (await sql`
        SELECT id FROM recipes
        WHERE id = ${op.entry.recipeId} AND archived_at IS NULL
      `) as { id: string }[];
      if (!existing[0]) break;
      // to_date() keeps the civil day as text so session/server TZ cannot shift it.
      await sql`
        INSERT INTO calendar_entries (id, recipe_id, cook_date)
        VALUES (
          ${op.entry.id},
          ${op.entry.recipeId},
          to_date(${op.entry.cookDate}, 'YYYY-MM-DD')
        )
        ON CONFLICT (recipe_id, cook_date) DO NOTHING
      `;
      break;
    }
    case "remove": {
      if (op.ids.length) {
        await sql`
          DELETE FROM calendar_entries
          WHERE id IN (
            SELECT jsonb_array_elements_text(${JSON.stringify(op.ids)}::jsonb)
          )
        `;
      }
      break;
    }
    case "removeByRecipe": {
      await sql`DELETE FROM calendar_entries WHERE recipe_id = ${op.recipeId}`;
      break;
    }
    case "removeUpcomingByRecipe": {
      if (!isCalendarDate(op.today)) break;
      await sql`
        DELETE FROM calendar_entries
        WHERE recipe_id = ${op.recipeId}
          AND cook_date >= to_date(${op.today}, 'YYYY-MM-DD')
      `;
      break;
    }
    default: {
      const _never: never = op;
      void _never;
    }
  }

  return loadCalendar();
}

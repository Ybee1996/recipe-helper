import { getSql } from "./db";
import { parseCategoryLabel } from "./category-input";
import { isBuiltinProtein, type CustomCategory } from "./types";

export { CATEGORY_LABEL_MAX, parseCategoryLabel, slugCategory } from "./category-input";

type CategoryRow = { id: string; label: string };

let tableReady = false;

async function ensureCategoriesTable() {
  if (tableReady) return;
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS categories (
      id text PRIMARY KEY,
      label text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  tableReady = true;
}

function rowToCategory(row: CategoryRow): CustomCategory | null {
  const id = row.id?.trim();
  const label = row.label?.trim();
  if (!id || !label) return null;
  return { id, label };
}

export async function loadCategories(): Promise<CustomCategory[]> {
  await ensureCategoriesTable();
  const sql = getSql();
  const rows = (await sql`
    SELECT id, label FROM categories
    ORDER BY created_at ASC, id ASC
  `) as CategoryRow[];
  return rows.map(rowToCategory).filter((c): c is CustomCategory => Boolean(c));
}

export async function getCategory(id: string): Promise<CustomCategory | null> {
  await ensureCategoriesTable();
  const sql = getSql();
  const rows = (await sql`
    SELECT id, label FROM categories WHERE id = ${id}
  `) as CategoryRow[];
  return rows[0] ? rowToCategory(rows[0]) : null;
}

export async function isKnownProtein(id: string): Promise<boolean> {
  if (isBuiltinProtein(id)) return true;
  return Boolean(await getCategory(id));
}

export async function createCategory(
  rawLabel: unknown,
): Promise<CustomCategory | { error: string; status: number }> {
  const parsed = parseCategoryLabel(rawLabel);
  if ("error" in parsed) return { error: parsed.error, status: 400 };

  const existing = await loadCategories();
  const clash = existing.find(
    (c) =>
      c.id === parsed.id ||
      c.label.toLowerCase() === parsed.label.toLowerCase(),
  );
  if (clash) {
    return { error: `${clash.label} is already a category`, status: 409 };
  }

  const sql = getSql();
  await sql`
    INSERT INTO categories (id, label)
    VALUES (${parsed.id}, ${parsed.label})
  `;
  return parsed;
}

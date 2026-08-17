import { getSql } from "./db";
import { parseCategoryLabel } from "./category-input";
import {
  mergeCategoryOrder,
  parseCategoryOrder,
} from "./category-order";
import { isBuiltinProtein, type CustomCategory } from "./types";

export { CATEGORY_LABEL_MAX, parseCategoryLabel, slugCategory } from "./category-input";

const ORDER_KEY = "category_order";

type CategoryRow = { id: string; label: string };

let tableReady = false;
let settingsReady = false;

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

async function ensureSettingsTable() {
  if (settingsReady) return;
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS app_settings (
      key text PRIMARY KEY,
      value jsonb NOT NULL
    )
  `;
  settingsReady = true;
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

export async function loadCategoryOrder(): Promise<string[]> {
  await ensureSettingsTable();
  const sql = getSql();
  const rows = (await sql`
    SELECT value FROM app_settings WHERE key = ${ORDER_KEY}
  `) as { value: unknown }[];
  return parseCategoryOrder(rows[0]?.value);
}

export async function writeCategoryOrder(next: string[]): Promise<string[]> {
  await ensureSettingsTable();
  const order = parseCategoryOrder(next);
  const sql = getSql();
  await sql`
    INSERT INTO app_settings (key, value)
    VALUES (${ORDER_KEY}, ${JSON.stringify(order)}::jsonb)
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
  `;
  return order;
}

export async function saveCategoryOrder(
  raw: unknown,
): Promise<string[] | { error: string; status: number }> {
  if (!Array.isArray(raw)) {
    return { error: "Order must be a list of categories", status: 400 };
  }
  if (raw.length > 80) {
    return { error: "Too many categories", status: 400 };
  }
  const order = parseCategoryOrder(raw);
  const previous = await loadCategoryOrder();
  const next = mergeCategoryOrder(order, previous);
  const sql = getSql();
  await sql`
    INSERT INTO app_settings (key, value)
    VALUES (${ORDER_KEY}, ${JSON.stringify(next)}::jsonb)
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
  `;
  return next;
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
  const previous = await loadCategoryOrder();
  if (previous.length && !previous.includes(parsed.id)) {
    await saveCategoryOrder([...previous, parsed.id]);
  }
  return parsed;
}

export async function deleteCategory(
  id: string,
): Promise<{ moved: number } | { error: string; status: number }> {
  if (!id || isBuiltinProtein(id)) {
    return { error: "Default categories can’t be deleted", status: 400 };
  }

  const sql = getSql();
  await ensureCategoriesTable();

  const movedRows = (await sql`
    UPDATE recipes
    SET
      protein = 'other',
      data = CASE
        WHEN data->>'protein' = ${id}
          THEN jsonb_set(data, '{protein}', '"other"'::jsonb)
        ELSE data
      END,
      overlay = CASE
        WHEN overlay->>'protein' = ${id}
          THEN jsonb_set(overlay, '{protein}', '"other"'::jsonb)
        ELSE overlay
      END,
      updated_at = now()
    WHERE protein = ${id}
       OR overlay->>'protein' = ${id}
       OR data->>'protein' = ${id}
    RETURNING id
  `) as { id: string }[];

  await sql`DELETE FROM categories WHERE id = ${id}`;

  const previous = await loadCategoryOrder();
  if (previous.includes(id)) {
    await writeCategoryOrder(previous.filter((item) => item !== id));
  }

  return { moved: movedRows.length };
}

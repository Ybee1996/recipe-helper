import { getSql } from "./db";
import { isShoppingItem, type ShoppingItem, type ShoppingListOp } from "./shopping-list";

type ShoppingRow = {
  id: string;
  name: string;
  qty: string;
  recipe_id: string | null;
  recipe_title: string | null;
  checked: boolean;
};

let tableReady = false;

async function ensureShoppingItemsTable() {
  if (tableReady) return;
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS shopping_items (
      id text PRIMARY KEY,
      name text NOT NULL,
      qty text NOT NULL DEFAULT '',
      recipe_id text,
      recipe_title text,
      checked boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  tableReady = true;
}

function rowToItem(row: ShoppingRow): ShoppingItem {
  const item: ShoppingItem = {
    id: row.id,
    name: row.name,
    qty: row.qty ?? "",
    checked: Boolean(row.checked),
  };
  if (row.recipe_id) item.recipeId = row.recipe_id;
  if (row.recipe_title) item.recipeTitle = row.recipe_title;
  return item;
}

export async function loadShoppingItemsFromDb(): Promise<ShoppingItem[]> {
  await ensureShoppingItemsTable();
  const sql = getSql();
  const rows = (await sql`
    SELECT id, name, qty, recipe_id, recipe_title, checked
    FROM shopping_items
    ORDER BY created_at ASC, id ASC
  `) as ShoppingRow[];
  return rows.map(rowToItem).filter(isShoppingItem);
}

function addPayload(items: ShoppingItem[]) {
  const now = Date.now();
  return items.map((item, i) => ({
    id: item.id,
    name: item.name.trim().slice(0, 60),
    qty: item.qty.trim().slice(0, 8),
    recipe_id: item.recipeId?.slice(0, 120) || null,
    recipe_title: item.recipeTitle?.trim().slice(0, 200) || null,
    checked: item.checked,
    created_at: new Date(now + i).toISOString(),
  }));
}

export async function applyShoppingListOp(
  op: ShoppingListOp,
): Promise<ShoppingItem[]> {
  await ensureShoppingItemsTable();
  const sql = getSql();

  switch (op.op) {
    case "add": {
      const items = op.items.filter((item) => item.name.trim());
      if (items.length) {
        await sql`
          INSERT INTO shopping_items (id, name, qty, recipe_id, recipe_title, checked, created_at)
          SELECT id, name, qty, recipe_id, recipe_title, checked, created_at
          FROM jsonb_to_recordset(${JSON.stringify(addPayload(items))}::jsonb)
            AS x(
              id text,
              name text,
              qty text,
              recipe_id text,
              recipe_title text,
              checked boolean,
              created_at timestamptz
            )
          ON CONFLICT (id) DO NOTHING
        `;
      }
      break;
    }
    case "remove": {
      if (op.ids.length) {
        await sql`
          DELETE FROM shopping_items
          WHERE id IN (
            SELECT jsonb_array_elements_text(${JSON.stringify(op.ids)}::jsonb)
          )
        `;
      }
      break;
    }
    case "setChecked": {
      await sql`
        UPDATE shopping_items
        SET checked = ${op.checked}
        WHERE id = ${op.id}
      `;
      break;
    }
    case "removeByRecipe": {
      await sql`DELETE FROM shopping_items WHERE recipe_id = ${op.recipeId}`;
      break;
    }
    case "removeByRecipeName": {
      await sql`
        DELETE FROM shopping_items
        WHERE recipe_id = ${op.recipeId} AND btrim(name) = ${op.name}
      `;
      break;
    }
    case "clearChecked": {
      await sql`DELETE FROM shopping_items WHERE checked`;
      break;
    }
    case "clearAll": {
      await sql`DELETE FROM shopping_items`;
      break;
    }
    default: {
      const _never: never = op;
      void _never;
    }
  }

  return loadShoppingItemsFromDb();
}

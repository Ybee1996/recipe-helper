import { NextResponse } from "next/server";
import {
  applyShoppingListOp,
  loadShoppingItemsFromDb,
} from "@/lib/shopping-list-store";
import { isShoppingItem, type ShoppingListOp } from "@/lib/shopping-list";

export const dynamic = "force-dynamic";

function parseOp(body: unknown): ShoppingListOp | null {
  if (!body || typeof body !== "object") return null;
  const raw = body as { op?: unknown };

  switch (raw.op) {
    case "add": {
      const items = (raw as { items?: unknown }).items;
      if (!Array.isArray(items) || items.length > 200) return null;
      const parsed = items.filter(isShoppingItem);
      if (parsed.length !== items.length) return null;
      return { op: "add", items: parsed };
    }
    case "remove": {
      const ids = (raw as { ids?: unknown }).ids;
      if (
        !Array.isArray(ids) ||
        ids.length === 0 ||
        ids.length > 200 ||
        !ids.every((id) => typeof id === "string" && id.length > 0 && id.length <= 80)
      ) {
        return null;
      }
      return { op: "remove", ids };
    }
    case "setChecked": {
      const { id, checked } = raw as { id?: unknown; checked?: unknown };
      if (typeof id !== "string" || !id || id.length > 80) return null;
      if (typeof checked !== "boolean") return null;
      return { op: "setChecked", id, checked };
    }
    case "removeByRecipe": {
      const recipeId = (raw as { recipeId?: unknown }).recipeId;
      if (typeof recipeId !== "string" || !recipeId) return null;
      return { op: "removeByRecipe", recipeId };
    }
    case "removeByRecipeName": {
      const { recipeId, name } = raw as { recipeId?: unknown; name?: unknown };
      if (typeof recipeId !== "string" || !recipeId) return null;
      if (typeof name !== "string" || !name.trim()) return null;
      return { op: "removeByRecipeName", recipeId, name: name.trim() };
    }
    case "clearChecked":
      return { op: "clearChecked" };
    case "clearAll":
      return { op: "clearAll" };
    default:
      return null;
  }
}

export async function GET() {
  return NextResponse.json({ items: await loadShoppingItemsFromDb() });
}

export async function POST(req: Request) {
  const op = parseOp(await req.json().catch(() => null));
  if (!op) {
    return NextResponse.json({ error: "Invalid shopping list update" }, { status: 400 });
  }
  return NextResponse.json({ items: await applyShoppingListOp(op) });
}

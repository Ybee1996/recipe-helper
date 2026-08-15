export interface ShoppingItem {
  id: string;
  name: string;
  qty: string;
  recipeId?: string;
  recipeTitle?: string;
  checked: boolean;
}

const STORAGE_KEY = "recipe-box-shopping-list";

export function loadShoppingItems(): ShoppingItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isShoppingItem);
  } catch {
    return [];
  }
}

export function saveShoppingItems(items: ShoppingItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function clearShoppingList(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

function isShoppingItem(value: unknown): value is ShoppingItem {
  if (!value || typeof value !== "object") return false;
  const item = value as ShoppingItem;
  return (
    typeof item.id === "string" &&
    typeof item.name === "string" &&
    typeof item.qty === "string" &&
    typeof item.checked === "boolean" &&
    (item.recipeId === undefined || typeof item.recipeId === "string") &&
    (item.recipeTitle === undefined || typeof item.recipeTitle === "string")
  );
}

export function newShoppingItem(
  input: Omit<ShoppingItem, "id" | "checked">,
): ShoppingItem {
  return {
    ...input,
    id: crypto.randomUUID(),
    checked: false,
  };
}

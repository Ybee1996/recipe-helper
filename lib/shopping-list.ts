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

function newItemId(): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return uuid;
  const bytes = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function newShoppingItem(
  input: Omit<ShoppingItem, "id" | "checked">,
): ShoppingItem {
  return {
    ...input,
    id: newItemId(),
    checked: false,
  };
}

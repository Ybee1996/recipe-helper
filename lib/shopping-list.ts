export interface ShoppingItem {
  id: string;
  name: string;
  qty: string;
  recipeId?: string;
  recipeTitle?: string;
  checked: boolean;
}

export type ShoppingListOp =
  | { op: "add"; items: ShoppingItem[] }
  | { op: "remove"; ids: string[] }
  | { op: "setChecked"; id: string; checked: boolean }
  | { op: "removeByRecipe"; recipeId: string }
  | { op: "removeByRecipeName"; recipeId: string; name: string }
  | { op: "clearChecked" }
  | { op: "clearAll" };

export const SHOPPING_LIST_STORAGE_KEY = "recipe-box-shopping-list";
const SYNCED_KEY = "recipe-box-shopping-list-synced";

export function loadShoppingItems(): ShoppingItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SHOPPING_LIST_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isShoppingItem);
  } catch {
    return [];
  }
}

export function saveShoppingItems(items: ShoppingItem[]): void {
  localStorage.setItem(SHOPPING_LIST_STORAGE_KEY, JSON.stringify(items));
}

export function clearShoppingList(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SHOPPING_LIST_STORAGE_KEY);
}

export function hasSyncedShoppingList(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(SYNCED_KEY) === "1";
}

export function markShoppingListSynced(): void {
  localStorage.setItem(SYNCED_KEY, "1");
}

export function isShoppingItem(value: unknown): value is ShoppingItem {
  if (!value || typeof value !== "object") return false;
  const item = value as ShoppingItem;
  return (
    typeof item.id === "string" &&
    item.id.length > 0 &&
    item.id.length <= 80 &&
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

export function shoppingListsEqual(a: ShoppingItem[], b: ShoppingItem[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function itemKey(item: ShoppingItem): string {
  return `${item.recipeId ?? ""}|${item.name.trim().toLowerCase()}|${item.qty.trim().toLowerCase()}`;
}

/** Union remote with local-only items. Same-id and same-content rows stay on the server copy. */
export function mergeShoppingLists(
  local: ShoppingItem[],
  remote: ShoppingItem[],
): { items: ShoppingItem[]; toUpload: ShoppingItem[] } {
  const remoteIds = new Set(remote.map((item) => item.id));
  const remoteKeys = new Set(remote.map(itemKey));
  const toUpload: ShoppingItem[] = [];
  for (const item of local) {
    if (remoteIds.has(item.id) || remoteKeys.has(itemKey(item))) continue;
    remoteIds.add(item.id);
    remoteKeys.add(itemKey(item));
    toUpload.push(item);
  }
  return { items: [...remote, ...toUpload], toUpload };
}

function parseItemsPayload(value: unknown): ShoppingItem[] {
  if (!value || typeof value !== "object") return [];
  const items = (value as { items?: unknown }).items;
  if (!Array.isArray(items)) return [];
  return items.filter(isShoppingItem);
}

export async function fetchShoppingList(): Promise<ShoppingItem[]> {
  const res = await fetch("/api/shopping-list", { cache: "no-store" });
  if (!res.ok) throw new Error("Could not load shopping list");
  return parseItemsPayload(await res.json());
}

export async function postShoppingListOp(
  op: ShoppingListOp,
): Promise<ShoppingItem[]> {
  const res = await fetch("/api/shopping-list", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify(op),
  });
  if (!res.ok) throw new Error("Could not save shopping list");
  return parseItemsPayload(await res.json());
}

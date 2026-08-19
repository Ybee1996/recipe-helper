export const SHOPPING_HISTORY_STORAGE_KEY = "recipe-box-shopping-history";
export const SHOPPING_HISTORY_CAP = 160;
const SUGGEST_LIMIT = 6;

export interface ShoppingHistoryEntry {
  name: string;
  qty: string;
}

function isHistoryEntry(value: unknown): value is ShoppingHistoryEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as ShoppingHistoryEntry;
  return (
    typeof entry.name === "string" &&
    entry.name.trim().length > 0 &&
    typeof entry.qty === "string"
  );
}

export function loadShoppingHistory(): ShoppingHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SHOPPING_HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    const next: ShoppingHistoryEntry[] = [];
    for (const value of parsed) {
      if (!isHistoryEntry(value)) continue;
      const name = value.name.trim();
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      next.push({ name, qty: value.qty.trim() });
      if (next.length >= SHOPPING_HISTORY_CAP) break;
    }
    return next;
  } catch {
    return [];
  }
}

function saveShoppingHistory(entries: ShoppingHistoryEntry[]): void {
  localStorage.setItem(SHOPPING_HISTORY_STORAGE_KEY, JSON.stringify(entries));
}

export function recordShoppingHistory(name: string, qty: string): void {
  if (typeof window === "undefined") return;
  const trimmed = name.trim();
  if (!trimmed) return;
  const key = trimmed.toLowerCase();
  const rest = loadShoppingHistory().filter(
    (entry) => entry.name.toLowerCase() !== key,
  );
  saveShoppingHistory(
    [{ name: trimmed, qty: qty.trim() }, ...rest].slice(0, SHOPPING_HISTORY_CAP),
  );
}

export function matchShoppingHistory(
  query: string,
  excludeLower: ReadonlySet<string>,
  limit = SUGGEST_LIMIT,
): ShoppingHistoryEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const prefix: ShoppingHistoryEntry[] = [];
  const substr: ShoppingHistoryEntry[] = [];
  for (const entry of loadShoppingHistory()) {
    const n = entry.name.toLowerCase();
    if (n === q || excludeLower.has(n)) continue;
    if (n.startsWith(q)) prefix.push(entry);
    else if (n.includes(q)) substr.push(entry);
    if (prefix.length >= limit) break;
  }
  return [...prefix, ...substr].slice(0, limit);
}

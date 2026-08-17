import { isProtein } from "./types";

export function applyCategoryOrder(ids: string[], order: string[]): string[] {
  const remaining = new Set(ids);
  const out: string[] = [];
  for (const id of order) {
    if (!remaining.has(id)) continue;
    out.push(id);
    remaining.delete(id);
  }
  for (const id of ids) {
    if (!remaining.has(id)) continue;
    out.push(id);
    remaining.delete(id);
  }
  return out;
}

export function parseCategoryOrder(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (!isProtein(item) || seen.has(item)) continue;
    seen.add(item);
    out.push(item);
  }
  return out;
}

export function mergeCategoryOrder(
  displayed: string[],
  previous: string[],
): string[] {
  const seen = new Set(displayed);
  return [
    ...displayed,
    ...previous.filter((id) => {
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    }),
  ];
}

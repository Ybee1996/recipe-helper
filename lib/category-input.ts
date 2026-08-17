import {
  isBuiltinProtein,
  PROTEIN_LABELS,
} from "./types";

export const CATEGORY_LABEL_MAX = 24;

export function slugCategory(label: string): string {
  return label
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function displayLabel(label: string): string {
  if (/[A-Z]/.test(label)) return label;
  return label.replace(/\b\w/g, (ch) => ch.toUpperCase());
}

export function parseCategoryLabel(
  raw: unknown,
): { id: string; label: string } | { error: string } {
  if (typeof raw !== "string") return { error: "Name is required" };
  const label = raw.trim().replace(/\s+/g, " ");
  if (!label) return { error: "Name is required" };
  if (label.length > CATEGORY_LABEL_MAX) {
    return { error: `Keep it under ${CATEGORY_LABEL_MAX} characters` };
  }
  const id = slugCategory(label);
  if (!id) return { error: "Use letters or numbers in the name" };
  if (isBuiltinProtein(id)) {
    return { error: `${PROTEIN_LABELS[id]} is already a category` };
  }
  return { id, label: displayLabel(label) };
}

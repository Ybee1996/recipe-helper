import type { Ingredient } from "@/lib/types";

const LEADING_DESCRIPTORS = new Set([
  "baby",
  "chopped",
  "cooked",
  "crushed",
  "cubed",
  "diced",
  "dried",
  "finely",
  "fresh",
  "frozen",
  "grated",
  "ground",
  "halved",
  "large",
  "medium",
  "minced",
  "peeled",
  "quartered",
  "raw",
  "roughly",
  "shredded",
  "sliced",
  "small",
  "smoked",
  "thickly",
  "thinly",
  "trimmed",
  "whole",
]);

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "for",
  "in",
  "of",
  "on",
  "or",
  "the",
  "to",
  "with",
]);

export type IngredientSpan = {
  start: number;
  end: number;
  ingredient: Ingredient;
};

export type MethodTextPart =
  | { type: "text"; value: string }
  | { type: "ingredient"; value: string; ingredient: Ingredient };

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function dropLeadingDescriptors(words: string[]): string[] {
  let i = 0;
  while (i < words.length - 1 && LEADING_DESCRIPTORS.has(words[i].toLowerCase())) {
    i += 1;
  }
  return words.slice(i);
}

function dropTrailingCloves(words: string[]): string[] {
  if (words.length < 2) return words;
  const last = words[words.length - 1].toLowerCase();
  if (last === "clove" || last === "cloves") return words.slice(0, -1);
  return words;
}

function significantWords(name: string): string[] {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .filter((word) => {
      const lower = word.toLowerCase();
      return !STOP_WORDS.has(lower) && !LEADING_DESCRIPTORS.has(lower);
    });
}

function spellingVariants(alias: string): string[] {
  const variants = new Set<string>([alias]);
  if (/chilli/i.test(alias)) {
    variants.add(alias.replace(/chilli/gi, "chili"));
  }
  if (/chili/i.test(alias) && !/chilli/i.test(alias)) {
    variants.add(alias.replace(/chili/gi, "chilli"));
  }
  return [...variants];
}

function aliasesFor(name: string): { alias: string; isFullName: boolean }[] {
  const trimmed = name.trim();
  if (!trimmed) return [];

  const found = new Map<string, boolean>();
  function add(alias: string, isFullName: boolean) {
    const key = normalize(alias);
    if (!key) return;
    const existing = found.get(key);
    if (existing == null) found.set(key, isFullName);
    else if (isFullName) found.set(key, true);
  }

  add(trimmed, true);
  for (const variant of spellingVariants(trimmed)) add(variant, variant === trimmed);

  const words = trimmed.split(/\s+/).filter(Boolean);
  const core = dropTrailingCloves(dropLeadingDescriptors(words)).join(" ");
  if (core) {
    add(core, false);
    for (const variant of spellingVariants(core)) add(variant, false);
  }

  const significant = dropTrailingCloves(significantWords(trimmed));
  const last = significant[significant.length - 1];
  if (last) {
    add(last, false);
    for (const variant of spellingVariants(last)) add(variant, false);
  }

  return [...found.entries()].map(([alias, isFullName]) => ({
    alias,
    isFullName,
  }));
}

function aliasAllowed(
  alias: string,
  isFullName: boolean,
  ingredientName: string,
): boolean {
  if (alias.length >= 3) return true;
  if (!isFullName) return false;
  return normalize(ingredientName).length < 3;
}

type AliasEntry = {
  alias: string;
  ingredient: Ingredient;
  isFullName: boolean;
};

function shouldUseLastWord(name: string): boolean {
  return !/\bfor the\b/i.test(name);
}

function collectAliases(ingredients: Ingredient[]): AliasEntry[] {
  const usable = ingredients.filter((item) => item.name.trim());
  const lastWordCount = new Map<string, number>();
  for (const item of usable) {
    if (!shouldUseLastWord(item.name)) continue;
    const significant = dropTrailingCloves(significantWords(item.name));
    const last = significant[significant.length - 1];
    if (!last) continue;
    const key = normalize(last);
    lastWordCount.set(key, (lastWordCount.get(key) ?? 0) + 1);
    for (const variant of spellingVariants(last)) {
      const vk = normalize(variant);
      if (vk !== key) lastWordCount.set(vk, (lastWordCount.get(vk) ?? 0) + 1);
    }
  }

  const entries: AliasEntry[] = [];
  for (const ingredient of usable) {
    const significant = dropTrailingCloves(significantWords(ingredient.name));
    const last = significant[significant.length - 1];
    const lastKey = last ? normalize(last) : null;
    const allowLast = shouldUseLastWord(ingredient.name);
    for (const { alias, isFullName } of aliasesFor(ingredient.name)) {
      const isLastWord =
        allowLast &&
        !isFullName &&
        lastKey != null &&
        (normalize(alias) === lastKey ||
          spellingVariants(last).some((v) => normalize(v) === normalize(alias)));
      if (isLastWord && (lastWordCount.get(normalize(alias)) ?? 0) > 1) {
        continue;
      }
      if (!allowLast && !isFullName && lastKey != null && normalize(alias) === lastKey) {
        continue;
      }
      if (!aliasAllowed(alias, isFullName, ingredient.name)) continue;
      entries.push({ alias, ingredient, isFullName });
    }
  }

  const byAlias = new Map<string, AliasEntry[]>();
  for (const entry of entries) {
    const key = normalize(entry.alias);
    const list = byAlias.get(key);
    if (list) list.push(entry);
    else byAlias.set(key, [entry]);
  }

  const unique: AliasEntry[] = [];
  for (const group of byAlias.values()) {
    const ingredientsInGroup = new Set(group.map((e) => e.ingredient));
    if (ingredientsInGroup.size === 1) {
      unique.push(group[0]);
      continue;
    }
    const full = group.filter((e) => e.isFullName);
    if (full.length === 1) unique.push(full[0]);
    else if (full.length > 1) unique.push(full[0]);
  }

  unique.sort((a, b) => b.alias.length - a.alias.length || a.alias.localeCompare(b.alias));
  return unique;
}

function rangesOverlap(
  start: number,
  end: number,
  taken: IngredientSpan[],
): boolean {
  return taken.some((span) => start < span.end && end > span.start);
}

export function findIngredientSpans(
  text: string,
  ingredients: Ingredient[],
): IngredientSpan[] {
  if (!text || !ingredients.length) return [];
  const aliases = collectAliases(ingredients);
  const spans: IngredientSpan[] = [];

  for (const { alias, ingredient } of aliases) {
    const pattern = new RegExp(`\\b${escapeRegExp(alias)}\\b`, "gi");
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      if (match[0].length === 0) {
        pattern.lastIndex += 1;
        continue;
      }
      if (!rangesOverlap(start, end, spans)) {
        spans.push({ start, end, ingredient });
      }
    }
  }

  spans.sort((a, b) => a.start - b.start);
  return spans;
}

export function splitLetteredSubsteps(text: string): string[] {
  const markers = text.match(/(?:^|\s)[a-z]\)/gi);
  if (!markers || markers.length < 2) return [text];

  const parts = text
    .split(/(?:\s+)(?=[a-z]\))/i)
    .map((part) => part.trim())
    .filter(Boolean);

  return parts.length >= 2 ? parts : [text];
}

export function splitMethodText(
  text: string,
  ingredients: Ingredient[],
): MethodTextPart[] {
  const spans = findIngredientSpans(text, ingredients);
  if (!spans.length) return text ? [{ type: "text", value: text }] : [];

  const parts: MethodTextPart[] = [];
  let cursor = 0;
  for (const span of spans) {
    if (span.start > cursor) {
      parts.push({ type: "text", value: text.slice(cursor, span.start) });
    }
    parts.push({
      type: "ingredient",
      value: text.slice(span.start, span.end),
      ingredient: span.ingredient,
    });
    cursor = span.end;
  }
  if (cursor < text.length) {
    parts.push({ type: "text", value: text.slice(cursor) });
  }
  return parts;
}

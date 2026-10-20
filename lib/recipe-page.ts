const PAGE_TEXT_MAX = 60000;

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  deg: "°",
  frac12: "½",
  frac14: "¼",
  frac34: "¾",
};

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z0-9]+);/gi, (match, code: string) => {
    if (code[0] === "#") {
      const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : match;
    }
    return ENTITIES[code.toLowerCase()] ?? match;
  });
}

/** Flatten HTML to readable text, keeping line breaks so list items and steps stay separate. */
export function htmlToText(html: string): string {
  let body = html;
  // Prefer the article/main region so page chrome doesn't eat the length budget.
  const region = body.match(/<(main|article)\b[\s\S]*?<\/\1>/i);
  if (region && region[0].length > 500) body = region[0];

  const text = body
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg|nav|header|footer|aside|form|iframe)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|ul|ol|h[1-6]|section|tr|table|figure|blockquote)>/gi, "\n")
    .replace(/<li\b[^>]*>/gi, "\n- ")
    .replace(/<[^>]+>/g, " ");

  return decodeEntities(text)
    .replace(/[ \t\f\v ]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, PAGE_TEXT_MAX);
}

type Json = unknown;

function isRecord(value: Json): value is Record<string, Json> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function hasType(node: Record<string, Json>, type: string): boolean {
  const t = node["@type"];
  return t === type || (Array.isArray(t) && t.includes(type));
}

function findRecipeNode(node: Json): Record<string, Json> | null {
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findRecipeNode(item);
      if (found) return found;
    }
    return null;
  }
  if (!isRecord(node)) return null;
  if (hasType(node, "Recipe")) return node;
  return findRecipeNode(node["@graph"]) ?? findRecipeNode(node["mainEntity"]);
}

function flattenInstructions(value: Json, out: string[]): void {
  if (typeof value === "string") {
    const text = decodeEntities(value.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " "))
      .replace(/[ \t]+/g, " ")
      .trim();
    if (text) out.push(text);
  } else if (Array.isArray(value)) {
    for (const item of value) flattenInstructions(item, out);
  } else if (isRecord(value)) {
    if (hasType(value, "HowToSection")) {
      const name = typeof value.name === "string" ? value.name.trim() : "";
      if (name) out.push(`[${name}]`);
      flattenInstructions(value.itemListElement, out);
    } else {
      flattenInstructions(value.text ?? value.name ?? value.itemListElement, out);
    }
  }
}

function asList(value: Json): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(asList);
  return [];
}

function numberSteps(flat: string[]): string[] {
  let n = 0;
  return flat.map((s) => (/^\[.*\]$/.test(s) ? s : `${++n}. ${s}`));
}

export type StructuredRecipe = {
  /** Text block to hand to the model as the authoritative source. */
  text: string;
  /** Method steps exactly as published (section headings excluded). */
  steps: string[];
};

/** Pull the schema.org Recipe from JSON-LD, which most recipe sites publish in full. */
export function extractStructuredRecipe(html: string): StructuredRecipe | null {
  const blocks = html.matchAll(
    /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  for (const block of blocks) {
    let data: Json;
    try {
      data = JSON.parse(block[1].trim());
    } catch {
      continue;
    }
    const recipe = findRecipeNode(data);
    if (!recipe) continue;

    const flat: string[] = [];
    flattenInstructions(recipe.recipeInstructions, flat);
    const steps = flat.filter((s) => !/^\[.*\]$/.test(s));
    if (steps.length === 0) continue;

    const ingredients = asList(recipe.recipeIngredient).map((s) => decodeEntities(s).trim());
    const lines = [
      `Name: ${asList(recipe.name).join(" ")}`,
      `Yield: ${asList(recipe.recipeYield).join(", ")}`,
      `Prep time: ${asList(recipe.prepTime).join("")}`,
      `Cook time: ${asList(recipe.cookTime).join("")}`,
      `Total time: ${asList(recipe.totalTime).join("")}`,
      "Ingredients:",
      ...ingredients.map((s) => `- ${s}`),
      "Method (every step, in order):",
      ...numberSteps(flat),
    ];
    if (isRecord(recipe.nutrition)) lines.push(`Nutrition: ${JSON.stringify(recipe.nutrition)}`);
    return { text: lines.join("\n"), steps };
  }
  return null;
}

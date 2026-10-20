import { NextResponse } from "next/server";
import OpenAI from "openai";
import {
  EXTRACT_IMPORT_RULES,
  EXTRACT_METHOD_RULES,
  recipeFromExtract,
} from "@/lib/recipe-input";
import { extractStructuredRecipe, htmlToText } from "@/lib/recipe-page";
import type { Recipe } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      // Many recipe sites 403 or serve a stripped page to unknown bots.
      "User-Agent":
        "Mozilla/5.0 (compatible; recipe-helper/0.1; +https://github.com/ybee1996/recipe-helper)",
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) {
    throw new Error(`Could not fetch URL (${res.status})`);
  }
  return res.text();
}

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Add OPENAI_API_KEY to enable URL import. You can still add a recipe by hand." },
      { status: 501 },
    );
  }

  const body = (await req.json()) as { url?: string };
  const url = body.url?.trim() ?? "";
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "Paste a valid http(s) URL" }, { status: 400 });
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return NextResponse.json({ error: "Paste a valid http(s) URL" }, { status: 400 });
  }

  let html: string;
  try {
    html = await fetchPage(parsed.toString());
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not fetch that URL" },
      { status: 400 },
    );
  }
  const structured = extractStructuredRecipe(html);
  const pageText = htmlToText(html);
  if (!structured && pageText.length < 40) {
    return NextResponse.json(
      { error: "That page did not have enough recipe text" },
      { status: 400 },
    );
  }

  const openai = new OpenAI({ apiKey });
  const source =
    (structured
      ? `STRUCTURED RECIPE DATA (authoritative; the method below is complete):\n${structured.text}\n\n`
      : "") + `PAGE TEXT:\n${pageText}`;

  async function extract(note = ""): Promise<Recipe | null> {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Extract a single recipe as JSON matching this schema: " +
            "id, title, source='web', sourceUrl, protein (chicken|beef|pork|fish|veggie|dessert|other; use dessert for sweets, cakes, puddings), " +
            "cookTimeMin, servings, tags[], allergens[] (gluten,milk,egg,soy,peanut,tree_nut," +
            "mustard,sulphites,sesame,celery,fish,crustacean), " +
            "ingredients[{name,qty2}], pantry[], tools[], steps[{n,title,text}], " +
            "nutrition{kcal,protein_g,fat_g,carbs_g} if present, highProtein (protein_g>=30). " +
            "qty2 is the listed quantity. If servings aren't 2, still put the listed qty in qty2. " +
            EXTRACT_IMPORT_RULES +
            " " +
            EXTRACT_METHOD_RULES +
            note,
        },
        {
          role: "user",
          content: `URL: ${parsed.toString()}\n\n${source}`,
        },
      ],
    });
    const choice = completion.choices[0];
    // A truncated JSON response would otherwise parse-fail or silently lose trailing steps.
    if (choice?.finish_reason === "length") return null;
    try {
      const raw = JSON.parse(choice?.message?.content || "{}") as Record<string, unknown>;
      return recipeFromExtract(raw, parsed.toString());
    } catch {
      return null;
    }
  }

  const expected = structured?.steps.length ?? 0;
  let recipe = await extract();
  if (recipe && recipe.steps.length < expected) {
    recipe =
      (await extract(
        ` The source has ${expected} method steps; your previous answer had ${recipe.steps.length}. ` +
          `Return all ${expected}, none merged or dropped.`,
      )) ?? recipe;
  }
  if (!recipe) {
    return NextResponse.json(
      { error: "Could not extract a recipe from that page" },
      { status: 422 },
    );
  }
  // Last resort: never ship a method shorter than what the page published.
  if (structured && recipe.steps.length < expected) {
    recipe.steps = structured.steps.map((text, i) => ({ n: i + 1, title: `Step ${i + 1}`, text }));
  }

  return NextResponse.json({ recipe });
}

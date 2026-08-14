import { NextResponse } from "next/server";
import OpenAI from "openai";
import { recipeFromExtract } from "@/lib/recipe-input";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 20000);
}

async function fetchPageText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "recipe-helper/0.1" },
    redirect: "follow",
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) {
    throw new Error(`Could not fetch URL (${res.status})`);
  }
  const html = await res.text();
  const text = htmlToText(html);
  if (text.length < 40) {
    throw new Error("That page did not have enough recipe text");
  }
  return text;
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

  let pageText: string;
  try {
    pageText = await fetchPageText(parsed.toString());
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not fetch that URL" },
      { status: 400 },
    );
  }

  const openai = new OpenAI({ apiKey });
  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini",
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "Extract a single recipe as JSON matching this schema: " +
          "id, title, source='web', sourceUrl, protein (chicken|beef|pork|fish|veggie|other), " +
          "cookTimeMin, servings, tags[], allergens[] (gluten,milk,egg,soy,peanut,tree_nut," +
          "mustard,sulphites,sesame,celery,fish,crustacean), " +
          "ingredients[{name,qty2}], pantry[], tools[], steps[{n,title,text}], " +
          "nutrition{kcal,protein_g,fat_g,carbs_g} if present, highProtein (protein_g>=30). " +
          "qty2 is the listed quantity. If servings aren't 2, still put the listed qty in qty2.",
      },
      {
        role: "user",
        content: `URL: ${parsed.toString()}\n\nPAGE TEXT:\n${pageText}`,
      },
    ],
  });

  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(completion.choices[0]?.message?.content || "{}") as Record<
      string,
      unknown
    >;
  } catch {
    return NextResponse.json(
      { error: "Could not extract a recipe from that page" },
      { status: 422 },
    );
  }
  const recipe = recipeFromExtract(raw, parsed.toString());
  if (!recipe) {
    return NextResponse.json(
      { error: "Could not extract a recipe from that page" },
      { status: 422 },
    );
  }

  return NextResponse.json({ recipe });
}

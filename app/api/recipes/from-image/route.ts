import { NextResponse } from "next/server";
import OpenAI from "openai";
import { EXTRACT_IMPORT_RULES, recipeFromExtract } from "@/lib/recipe-input";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ALLOWED_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const MAX_BYTES = 4 * 1024 * 1024;

function isPhoto(file: FormDataEntryValue | null): file is File {
  return file instanceof Blob && file.size > 0;
}

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Add OPENAI_API_KEY to enable photo import. You can still add a recipe by hand.",
      },
      { status: 501 },
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!isPhoto(file)) {
    return NextResponse.json({ error: "Choose a recipe photo" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Photo must be JPEG, PNG, or WebP" },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Photo is too large" }, { status: 400 });
  }

  const mime = file.type === "image/jpg" ? "image/jpeg" : file.type;
  const b64 = Buffer.from(await file.arrayBuffer()).toString("base64");

  const openai = new OpenAI({ apiKey });
  let content: string | null | undefined;
  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_VISION_MODEL ?? "gpt-4o",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Extract a single recipe from a photo of a recipe card, cookbook page, or handwritten recipe. " +
            "Return JSON matching this schema: " +
            "id, title, source='web', protein (chicken|beef|pork|fish|veggie|dessert|other; use dessert for sweets, cakes, puddings), " +
            "cookTimeMin, servings, tags[], allergens[] (gluten,milk,egg,soy,peanut,tree_nut," +
            "mustard,sulphites,sesame,celery,fish,crustacean), " +
            "ingredients[{name,qty2}], pantry[], tools[], steps[{n,title,text}], " +
            "nutrition{kcal,protein_g,fat_g,carbs_g} if present, highProtein (protein_g>=30). " +
            "Transcribe printed quantities exactly; do not invent grams. qty2 is the listed quantity. " +
            "If servings aren't 2, still put the listed qty in qty2. " +
            "If cook time is a range, use the upper number. " +
            "If more than one recipe is visible, extract the main/clearest one. " +
            "Do not include a sourceUrl or image. " +
            EXTRACT_IMPORT_RULES,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Read this recipe photo and extract the recipe as JSON.",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mime};base64,${b64}`,
                detail: "high",
              },
            },
          ],
        },
      ],
    });
    content = completion.choices[0]?.message?.content;
  } catch {
    return NextResponse.json(
      { error: "Could not read that photo. Try a clearer picture." },
      { status: 502 },
    );
  }

  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(content || "{}") as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "Could not extract a recipe from that photo" },
      { status: 422 },
    );
  }
  const recipe = recipeFromExtract(raw);
  if (!recipe) {
    return NextResponse.json(
      { error: "Could not extract a recipe from that photo" },
      { status: 422 },
    );
  }

  return NextResponse.json({ recipe });
}

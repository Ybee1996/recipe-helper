import { NextResponse } from "next/server";
import { compactRecipe, retrieveRecipes } from "@/lib/rag";
import { loadRecipes } from "@/lib/recipes";
import OpenAI from "openai";

export const runtime = "nodejs";

const SYSTEM = `You are a personal recipe assistant for a home cook.
Answer ONLY from the retrieved recipes in the knowledge base.
Be concise and phone-friendly: short paragraphs, bullets when listing.
If nothing fits, say so and suggest the closest match.
Always mention recipe titles and cite them as [title](id) using the recipe id.
Do not invent ingredients, times, or nutrition.
Default servings are 2 people unless asked otherwise.`;

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Add OPENAI_API_KEY to .env.local to enable the chatbot. Search still works without it.",
      },
      { status: 501 },
    );
  }

  const body = (await req.json()) as {
    messages?: { role: "user" | "assistant"; content: string }[];
  };
  const messages = body.messages ?? [];
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUser?.content?.trim()) {
    return NextResponse.json({ error: "Missing question" }, { status: 400 });
  }

  const recipes = await loadRecipes();
  const retrieved = retrieveRecipes(recipes, lastUser.content, 5);
  const context = retrieved.map(compactRecipe);

  const openai = new OpenAI({ apiKey });
  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini",
    temperature: 0.2,
    messages: [
      { role: "system", content: SYSTEM },
      {
        role: "system",
        content: `Retrieved recipes JSON:\n${JSON.stringify(context)}`,
      },
      ...messages.slice(-8),
    ],
  });

  const answer =
    completion.choices[0]?.message?.content?.trim() ||
    "I couldn't find a good match in your recipe box.";

  return NextResponse.json({
    answer,
    recipes: retrieved.map((r) => ({
      id: r.id,
      title: r.title,
      protein: r.protein,
      kcal: r.nutrition?.kcal,
      protein_g: r.nutrition?.protein_g,
    })),
  });
}

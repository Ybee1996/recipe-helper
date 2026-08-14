import { NextResponse } from "next/server";
import { insertRecipe } from "@/lib/recipes";
import { recipeFromManual } from "@/lib/recipe-input";
import { PROTEINS, type Protein } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json()) as {
    title?: string;
    protein?: string;
    cookTimeMin?: number | null;
    ingredientsText?: string;
    stepsText?: string;
  };

  const title = body.title?.trim() ?? "";
  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const protein = body.protein;
  if (!protein || !(PROTEINS as readonly string[]).includes(protein)) {
    return NextResponse.json({ error: "Pick a protein" }, { status: 400 });
  }

  let cookTimeMin: number | null | undefined = body.cookTimeMin;
  if (cookTimeMin != null) {
    if (typeof cookTimeMin !== "number" || !Number.isFinite(cookTimeMin) || cookTimeMin < 0) {
      return NextResponse.json({ error: "Cook time must be a number" }, { status: 400 });
    }
    cookTimeMin = Math.round(cookTimeMin);
  }

  const recipe = recipeFromManual({
    title,
    protein: protein as Protein,
    cookTimeMin,
    ingredientsText: body.ingredientsText ?? "",
    stepsText: body.stepsText ?? "",
  });

  const result = await insertRecipe(recipe);
  if (result === "conflict") {
    return NextResponse.json(
      {
        error: "A recipe with this title already exists. Try a different title.",
        id: recipe.id,
      },
      { status: 409 },
    );
  }

  return NextResponse.json({ id: recipe.id });
}

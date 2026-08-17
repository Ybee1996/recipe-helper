import { NextResponse } from "next/server";
import { isKnownProtein } from "@/lib/categories";
import { insertRecipe } from "@/lib/recipes";
import { recipeFromClient, recipeFromManual } from "@/lib/recipe-input";
import { isProtein, type Protein } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json()) as {
    title?: string;
    protein?: string;
    cookTimeMin?: number | null;
    ingredientsText?: string;
    stepsText?: string;
    recipe?: Record<string, unknown>;
  };

  if (body.recipe && typeof body.recipe === "object") {
    const recipe = recipeFromClient(body.recipe);
    if (!recipe) {
      return NextResponse.json({ error: "Invalid recipe data" }, { status: 400 });
    }

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

  const title = body.title?.trim() ?? "";
  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const protein = body.protein;
  if (!isProtein(protein) || !(await isKnownProtein(protein))) {
    return NextResponse.json({ error: "Pick a category" }, { status: 400 });
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

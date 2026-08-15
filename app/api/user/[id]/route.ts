import { NextResponse } from "next/server";
import { getRecipe, isProtein } from "@/lib/recipes";
import type { Ingredient, Step, UserRecipeOverlay } from "@/lib/types";
import { getOverlay, patchOverlay } from "@/lib/user-store";

export const dynamic = "force-dynamic";

function isIngredient(value: unknown): value is Ingredient {
  if (!value || typeof value !== "object") return false;
  const i = value as Ingredient;
  return typeof i.name === "string" && typeof i.qty2 === "string";
}

function isStep(value: unknown): value is Step {
  if (!value || typeof value !== "object") return false;
  const s = value as Step;
  return typeof s.title === "string" && typeof s.text === "string";
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!(await getRecipe(id))) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }
  return NextResponse.json(await getOverlay(id));
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!(await getRecipe(id))) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  const body = (await req.json()) as Record<string, unknown>;
  const patch: UserRecipeOverlay = {};

  if ("rating" in body) {
    if (body.rating === null) patch.rating = null;
    else if (
      typeof body.rating === "number" &&
      Number.isInteger(body.rating) &&
      body.rating >= 1 &&
      body.rating <= 10
    ) {
      patch.rating = body.rating;
    } else {
      return NextResponse.json({ error: "Rating must be 1–10" }, { status: 400 });
    }
  }

  if ("note" in body) {
    if (body.note === null) patch.note = null;
    else if (typeof body.note === "string") patch.note = body.note;
    else {
      return NextResponse.json({ error: "Note must be text" }, { status: 400 });
    }
  }

  if ("ingredients" in body) {
    if (!Array.isArray(body.ingredients) || !body.ingredients.every(isIngredient)) {
      return NextResponse.json({ error: "Invalid ingredients" }, { status: 400 });
    }
    patch.ingredients = body.ingredients.filter((i) => i.name.trim());
  }

  if ("pantry" in body) {
    if (!Array.isArray(body.pantry) || !body.pantry.every(isIngredient)) {
      return NextResponse.json({ error: "Invalid pantry" }, { status: 400 });
    }
    patch.pantry = body.pantry.filter((i) => i.name.trim());
  }

  if ("steps" in body) {
    if (!Array.isArray(body.steps) || !body.steps.every(isStep)) {
      return NextResponse.json({ error: "Invalid steps" }, { status: 400 });
    }
    patch.steps = body.steps
      .filter((s) => s.title.trim() || s.text.trim())
      .map((s, i) => ({ n: i + 1, title: s.title, text: s.text }));
  }

  if ("protein" in body) {
    if (!isProtein(body.protein)) {
      return NextResponse.json({ error: "Invalid protein" }, { status: 400 });
    }
    patch.protein = body.protein;
  }

  if ("cookTimeMin" in body) {
    if (body.cookTimeMin === null) patch.cookTimeMin = null;
    else if (
      typeof body.cookTimeMin === "number" &&
      Number.isFinite(body.cookTimeMin) &&
      body.cookTimeMin >= 0
    ) {
      patch.cookTimeMin = Math.round(body.cookTimeMin);
    } else {
      return NextResponse.json({ error: "Cook time must be a number" }, { status: 400 });
    }
  }

  if ("servings" in body) {
    if (
      typeof body.servings === "number" &&
      Number.isInteger(body.servings) &&
      body.servings >= 1
    ) {
      patch.servings = body.servings;
    } else {
      return NextResponse.json(
        { error: "Servings must be a whole number of at least 1" },
        { status: 400 },
      );
    }
  }

  const overlay = await patchOverlay(id, patch);
  return NextResponse.json(overlay);
}

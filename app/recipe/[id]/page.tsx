import { notFound } from "next/navigation";
import { RecipeDetail } from "@/components/RecipeDetail";
import { getRecipe, loadRecipes } from "@/lib/recipes";

export function generateStaticParams() {
  return loadRecipes().map((r) => ({ id: r.id }));
}

export default async function RecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const recipe = getRecipe(id);
  if (!recipe) notFound();
  return <RecipeDetail recipe={recipe} />;
}

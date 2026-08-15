import { notFound } from "next/navigation";
import { RecipeDetail } from "@/components/RecipeDetail";
import { getRecipe } from "@/lib/recipes";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function RecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const recipe = await getRecipe(id);
  if (!recipe) notFound();
  return <RecipeDetail recipe={recipe} />;
}

import { loadRecipes } from "@/lib/recipes";
import { RecipeSearch } from "@/components/RecipeSearch";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  const recipes = await loadRecipes();
  return <RecipeSearch recipes={recipes} />;
}

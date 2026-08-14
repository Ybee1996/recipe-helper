import { loadRecipes } from "@/lib/recipes";
import { RecipeSearch } from "@/components/RecipeSearch";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function HomePage() {
  const recipes = loadRecipes();
  return <RecipeSearch recipes={recipes} />;
}

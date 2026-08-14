import { loadRecipes } from "@/lib/recipes";
import { RecipeSearch } from "@/components/RecipeSearch";

export default function HomePage() {
  const recipes = loadRecipes();
  return <RecipeSearch recipes={recipes} />;
}

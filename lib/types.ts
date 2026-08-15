export const PROTEINS = [
  "chicken",
  "beef",
  "pork",
  "fish",
  "veggie",
  "dessert",
  "other",
] as const;
export type Protein = (typeof PROTEINS)[number];

export const ALLERGENS = [
  "gluten",
  "milk",
  "egg",
  "soy",
  "peanut",
  "tree_nut",
  "mustard",
  "sulphites",
  "sesame",
  "celery",
  "fish",
  "crustacean",
] as const;
export type Allergen = (typeof ALLERGENS)[number];

export const DIETARY_FILTERS = [
  "high_protein",
  "dairy_free",
  "gluten_free",
  "nut_free",
] as const;
export type DietaryFilter = (typeof DIETARY_FILTERS)[number];

export type RecipeSource = "hellofresh" | "web";

export interface Ingredient {
  name: string;
  qty2: string;
  qty3?: string;
  qty4?: string;
  pantry?: boolean;
}

export interface Step {
  n: number;
  title: string;
  text: string;
}

export interface Nutrition {
  kcal: number;
  kj?: number;
  fat_g: number;
  sat_fat_g?: number;
  carbs_g: number;
  sugars_g?: number;
  protein_g: number;
  salt_g?: number;
}

export interface Recipe {
  id: string;
  title: string;
  source: RecipeSource;
  sourceUrl?: string;
  protein: Protein;
  cookTimeMin?: number | null;
  servings: number;
  tags: string[];
  allergens: Allergen[];
  ingredients: Ingredient[];
  pantry: Ingredient[];
  tools: string[];
  steps: Step[];
  nutrition?: Nutrition;
  highProtein: boolean;
  pdf?: { file: string; page: number };
  rating?: number | null;
  note?: string | null;
  imageUrl?: string | null;
}

/** Personal edits stored separately so PDF ingest never overwrites them. */
export interface UserRecipeOverlay {
  rating?: number | null;
  note?: string | null;
  imageUrl?: string | null;
  protein?: Protein;
  cookTimeMin?: number | null;
  ingredients?: Ingredient[];
  pantry?: Ingredient[];
  steps?: Step[];
  updatedAt?: string;
}

export interface SearchFilters {
  query: string;
  proteins: Protein[];
  dietary: DietaryFilter[];
  avoidAllergens?: Allergen[];
}

export const ALLERGEN_LABELS: Record<Allergen, string> = {
  gluten: "Gluten",
  milk: "Dairy",
  egg: "Egg",
  soy: "Soy",
  peanut: "Peanut",
  tree_nut: "Tree nut",
  mustard: "Mustard",
  sulphites: "Sulphites",
  sesame: "Sesame",
  celery: "Celery",
  fish: "Fish",
  crustacean: "Crustacean",
};

export const PROTEIN_LABELS: Record<Protein, string> = {
  chicken: "Chicken",
  beef: "Beef",
  pork: "Pork",
  fish: "Fish",
  veggie: "Veggie",
  dessert: "Dessert",
  other: "Other",
};

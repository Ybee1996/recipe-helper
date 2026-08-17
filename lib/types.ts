export const PROTEINS = [
  "chicken",
  "beef",
  "pork",
  "fish",
  "veggie",
  "dessert",
  "other",
] as const;
export type BuiltinProtein = (typeof PROTEINS)[number];
/** Built-in category or a user-created slug. */
export type Protein = BuiltinProtein | (string & {});

export const PROTEIN_FILTERS: BuiltinProtein[] = [
  "chicken",
  "beef",
  "pork",
  "fish",
  "veggie",
  "dessert",
];

export interface CustomCategory {
  id: string;
  label: string;
}

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
  originalImageUrl?: string | null;
  favourite?: boolean;
}

/** Personal edits stored separately so PDF ingest never overwrites them. */
export interface UserRecipeOverlay {
  title?: string;
  rating?: number | null;
  note?: string | null;
  imageUrl?: string | null;
  originalImageUrl?: string | null;
  favourite?: boolean;
  protein?: Protein;
  cookTimeMin?: number | null;
  servings?: number;
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

export const PROTEIN_LABELS: Record<BuiltinProtein, string> = {
  chicken: "Chicken",
  beef: "Beef",
  pork: "Pork",
  fish: "Fish",
  veggie: "Veggie",
  dessert: "Dessert",
  other: "Other",
};

export function isBuiltinProtein(value: unknown): value is BuiltinProtein {
  return (
    typeof value === "string" &&
    (PROTEINS as readonly string[]).includes(value)
  );
}

export function isProtein(value: unknown): value is Protein {
  return (
    typeof value === "string" &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) &&
    value.length <= 40
  );
}

export function proteinLabel(
  protein: string,
  custom: readonly CustomCategory[] = [],
): string {
  if (isBuiltinProtein(protein)) return PROTEIN_LABELS[protein];
  const match = custom.find((c) => c.id === protein);
  if (match) return match.label;
  return (
    protein
      .split("-")
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ") || protein
  );
}

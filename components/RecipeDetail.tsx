"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  EditableIngredients,
  splitPantry,
  type ListedIngredient,
} from "@/components/EditableIngredients";
import { EditableSteps } from "@/components/EditableSteps";
import { RecipeImage } from "@/components/RecipeImage";
import { RecipeNote } from "@/components/RecipeNote";
import { SourceRecipeLink } from "@/components/SourceRecipeLink";
import { StarRating } from "@/components/StarRating";
import { saveOverlay } from "@/lib/save-overlay";
import type { Protein, Recipe, Step } from "@/lib/types";
import { ALLERGEN_LABELS, PROTEIN_LABELS, PROTEINS } from "@/lib/types";

function listedFrom(recipe: Recipe): ListedIngredient[] {
  return [
    ...recipe.ingredients.map((i) => ({ ...i, pantry: false as const })),
    ...recipe.pantry.map((i) => ({ ...i, pantry: true as const })),
  ];
}

export function RecipeDetail({ recipe }: { recipe: Recipe }) {
  const router = useRouter();
  const scalable = recipe.source === "web";
  const [servings, setServings] = useState<number>(() =>
    scalable ? recipe.servings || 2 : 2,
  );
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [rating, setRating] = useState<number | null>(recipe.rating ?? null);
  const [note, setNote] = useState<string | null>(recipe.note ?? null);
  const [imageUrl, setImageUrl] = useState<string | null>(recipe.imageUrl ?? null);
  const [protein, setProtein] = useState<Protein>(recipe.protein);
  const [items, setItems] = useState<ListedIngredient[]>(() => listedFrom(recipe));
  const [steps, setSteps] = useState<Step[]>(recipe.steps);
  const [editingIngredients, setEditingIngredients] = useState(false);
  const [editingSteps, setEditingSteps] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const skipIngredientSave = useRef(true);
  const skipStepSave = useRef(true);

  function handleImageChange(url: string | null) {
    setImageUrl(url);
    router.refresh();
  }

  useEffect(() => {
    setRating(recipe.rating ?? null);
    setNote(recipe.note ?? null);
    setImageUrl(recipe.imageUrl ?? null);
    setItems(listedFrom(recipe));
    setSteps(recipe.steps);
    setEditingIngredients(false);
    setEditingSteps(false);
    skipIngredientSave.current = true;
    skipStepSave.current = true;
    setChecked(new Set());
    setServings(scalable ? recipe.servings || 2 : 2);
  }, [recipe.id, recipe.servings, scalable]);

  async function persist(
    payload: Parameters<typeof saveOverlay>[1],
    refresh = true,
  ) {
    setError(null);
    try {
      await saveOverlay(recipe.id, payload);
      if (refresh) router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    }
  }

  useEffect(() => {
    if (skipIngredientSave.current) {
      skipIngredientSave.current = false;
      return;
    }
    if (!editingIngredients) return;
    const handle = setTimeout(() => {
      const { ingredients, pantry } = splitPantry(items);
      void persist({ ingredients, pantry }, false);
    }, 450);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, editingIngredients]);

  useEffect(() => {
    if (skipStepSave.current) {
      skipStepSave.current = false;
      return;
    }
    if (!editingSteps) return;
    const handle = setTimeout(() => {
      void persist({
        steps: steps.map((s, i) => ({ ...s, n: i + 1 })),
      }, false);
    }, 450);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps, editingSteps]);

  return (
    <article className="px-4 pb-8 pt-4">
      <Link href="/" className="text-sm font-semibold text-[var(--accent)]">
        ← Recipes
      </Link>

      <div className="mt-3 flex items-start justify-between gap-3">
        <h1
          className="min-w-0 text-[1.75rem] font-medium leading-tight"
          style={{ fontFamily: "var(--font-display), Georgia, serif" }}
        >
          {recipe.title}
        </h1>
        <div className="mt-1 flex shrink-0 items-center">
          {!imageUrl ? (
            <RecipeImage
              recipeId={recipe.id}
              imageUrl={imageUrl}
              onChange={handleImageChange}
              onError={setError}
            />
          ) : null}
          {recipe.sourceUrl ? <SourceRecipeLink url={recipe.sourceUrl} /> : null}
        </div>
      </div>

      {imageUrl ? (
        <RecipeImage
          recipeId={recipe.id}
          imageUrl={imageUrl}
          onChange={handleImageChange}
          onError={setError}
        />
      ) : null}

      <fieldset className="mt-3">
        <legend className="sr-only">Protein category</legend>
        <div className="flex flex-wrap gap-2">
          {PROTEINS.map((p) => {
            const on = protein === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => {
                  if (p === protein) return;
                  setProtein(p);
                  void persist({ protein: p });
                }}
                className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                  on
                    ? "bg-[var(--ink)] text-[var(--paper)]"
                    : "bg-[var(--chip)] text-[var(--ink)]"
                }`}
              >
                {PROTEIN_LABELS[p]}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-2 flex flex-wrap gap-2">
        {recipe.highProtein && (
          <span className="rounded-full bg-[var(--sage)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
            High protein
          </span>
        )}
        {recipe.nutrition && (
          <span className="rounded-full bg-[var(--chip)] px-3 py-1 text-xs font-semibold">
            {recipe.nutrition.kcal} kcal · {recipe.nutrition.protein_g}g protein
          </span>
        )}
      </div>

      {recipe.allergens.length > 0 && (
        <p className="mt-3 text-sm text-[var(--muted)]">
          Contains {recipe.allergens.map((a) => ALLERGEN_LABELS[a]).join(", ")}
        </p>
      )}

      <div className="mt-5">
        <StarRating
          value={rating}
          onChange={(next) => {
            setRating(next);
            void persist({ rating: next });
          }}
        />
      </div>

      <RecipeNote
        note={note}
        onSave={async (text) => {
          setNote(text);
          await persist({ note: text });
        }}
        onDelete={async () => {
          setNote(null);
          await persist({ note: null });
        }}
      />

      {error && <p className="mt-3 text-sm text-[var(--accent)]">{error}</p>}

      <EditableIngredients
        items={items}
        servings={servings}
        baseServings={scalable ? recipe.servings || 2 : undefined}
        checked={checked}
        editing={editingIngredients}
        onToggleEdit={() => {
          if (editingIngredients) {
            const { ingredients, pantry } = splitPantry(items);
            void persist({ ingredients, pantry });
          } else {
            skipIngredientSave.current = true;
          }
          setEditingIngredients((v) => !v);
        }}
        onServings={setServings}
        onChange={setItems}
        onToggleChecked={(key) => {
          setChecked((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
          });
        }}
      />

      {recipe.tools.length > 0 && (
        <p className="mt-2 text-sm text-[var(--muted)]">
          Tools: {recipe.tools.join(", ")}
        </p>
      )}

      <EditableSteps
        steps={steps}
        editing={editingSteps}
        onToggleEdit={() => {
          if (editingSteps) {
            void persist({
              steps: steps.map((s, i) => ({ ...s, n: i + 1 })),
            });
          } else {
            skipStepSave.current = true;
          }
          setEditingSteps((v) => !v);
        }}
        onChange={setSteps}
      />
    </article>
  );
}

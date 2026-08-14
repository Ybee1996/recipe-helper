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

function cloneItems(items: ListedIngredient[]): ListedIngredient[] {
  return items.map((item) => ({ ...item }));
}

function cloneSteps(steps: Step[]): Step[] {
  return steps.map((step) => ({ ...step }));
}

function EditIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M11.6 3.35a1.4 1.4 0 0 1 2 0l.95.95a1.4 1.4 0 0 1 0 2L7.1 13.75 3.5 14.5l.75-3.6 7.35-7.55Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M10.4 4.55 13.45 7.6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
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
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const snapshot = useRef({
    protein: recipe.protein,
    note: recipe.note ?? null,
    items: listedFrom(recipe),
    steps: recipe.steps,
  });

  function handleImageChange(url: string | null) {
    setImageUrl(url);
    router.refresh();
  }

  function resetFromRecipe() {
    setRating(recipe.rating ?? null);
    setNote(recipe.note ?? null);
    setImageUrl(recipe.imageUrl ?? null);
    setProtein(recipe.protein);
    setItems(listedFrom(recipe));
    setSteps(recipe.steps);
    setEditing(false);
    setSaving(false);
    setChecked(new Set());
    setServings(scalable ? recipe.servings || 2 : 2);
  }

  useEffect(() => {
    resetFromRecipe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipe.id, recipe.servings, scalable]);

  async function persist(
    payload: Parameters<typeof saveOverlay>[1],
    refresh = true,
  ): Promise<boolean> {
    setError(null);
    try {
      await saveOverlay(recipe.id, payload);
      if (refresh) router.refresh();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
      return false;
    }
  }

  function startEditing() {
    snapshot.current = {
      protein,
      note,
      items: cloneItems(items),
      steps: cloneSteps(steps),
    };
    setError(null);
    setEditing(true);
  }

  function cancelEditing() {
    setProtein(snapshot.current.protein);
    setNote(snapshot.current.note);
    setItems(cloneItems(snapshot.current.items));
    setSteps(cloneSteps(snapshot.current.steps));
    setError(null);
    setEditing(false);
  }

  async function saveEditing() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const { ingredients, pantry } = splitPantry(items);
      const ok = await persist({
        protein,
        note: (note ?? "").trim() || null,
        ingredients,
        pantry,
        steps: steps.map((s, i) => ({ ...s, n: i + 1 })),
      });
      if (!ok) return;
      setNote((note ?? "").trim() || null);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="px-4 pb-8 pt-4">
      <div className="flex items-center justify-between gap-3">
        <Link href="/" className="text-sm font-semibold text-[var(--accent)]">
          ← Recipes
        </Link>
        {editing ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={cancelEditing}
              className="rounded-full bg-[var(--chip)] px-3.5 py-1.5 text-sm font-semibold disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveEditing()}
              className="rounded-full bg-[var(--ink)] px-3.5 py-1.5 text-sm font-semibold text-[var(--paper)] disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={startEditing}
            aria-label="Edit recipe"
            title="Edit recipe"
            className="inline-flex shrink-0 items-center justify-center rounded-full p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--chip)] hover:text-[var(--accent)]"
          >
            <EditIcon />
          </button>
        )}
      </div>

      <div className="mt-3 flex items-start justify-between gap-3">
        <h1
          className="min-w-0 text-[1.75rem] font-medium leading-tight"
          style={{ fontFamily: "var(--font-display), Georgia, serif" }}
        >
          {recipe.title}
        </h1>
        {recipe.sourceUrl ? <SourceRecipeLink url={recipe.sourceUrl} /> : null}
      </div>

      <RecipeImage
        recipeId={recipe.id}
        imageUrl={imageUrl}
        editing={editing}
        onChange={handleImageChange}
        onError={setError}
      />

      <div className="mt-3">
        {editing ? (
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">Category</legend>
            <div className="flex flex-wrap gap-2">
              {PROTEINS.map((p) => {
                const on = protein === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setProtein(p)}
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
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[var(--chip)] px-3 py-1 text-xs font-semibold uppercase tracking-wide">
              {PROTEIN_LABELS[protein]}
            </span>
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
        editing={editing}
        onChange={(text) => setNote(text)}
      />

      {error && <p className="mt-3 text-sm text-[var(--accent)]">{error}</p>}

      <EditableIngredients
        items={items}
        servings={servings}
        baseServings={scalable ? recipe.servings || 2 : undefined}
        checked={checked}
        editing={editing}
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

      <EditableSteps steps={steps} editing={editing} onChange={setSteps} />
    </article>
  );
}

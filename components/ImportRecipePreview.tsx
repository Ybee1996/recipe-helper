"use client";

import { useState } from "react";
import {
  EditableIngredients,
  splitPantry,
  type ListedIngredient,
} from "@/components/EditableIngredients";
import { EditableSteps } from "@/components/EditableSteps";
import { SourceRecipeLink } from "@/components/SourceRecipeLink";
import { formatCookTime } from "@/lib/format-time";
import { ALLERGEN_LABELS, PROTEIN_LABELS, type Recipe, type Step } from "@/lib/types";

const fieldClass =
  "w-full rounded-2xl border border-[var(--line)] bg-[var(--card)] px-4 py-3.5 text-base outline-none ring-[var(--accent)] placeholder:text-[var(--muted)] focus:ring-2";

function listedFrom(recipe: Recipe): ListedIngredient[] {
  return [
    ...recipe.ingredients.map((i) => ({ ...i, pantry: false as const })),
    ...recipe.pantry.map((i) => ({ ...i, pantry: true as const })),
  ];
}

export function ImportRecipePreview({
  recipe,
  saving,
  error,
  onCancel,
  onSave,
}: {
  recipe: Recipe;
  saving: boolean;
  error: string | null;
  onCancel: () => void;
  onSave: (payload: {
    title: string;
    items: ListedIngredient[];
    steps: Step[];
    servings: number;
  }) => void;
}) {
  const baseServings = recipe.servings || 2;
  const [title, setTitle] = useState(recipe.title);
  const [servings, setServings] = useState(baseServings);
  const [items, setItems] = useState<ListedIngredient[]>(() => listedFrom(recipe));
  const [steps, setSteps] = useState<Step[]>(recipe.steps);

  return (
    <div className="px-4 pt-5 pb-8 lg:mx-auto lg:max-w-3xl lg:px-10 lg:pt-10">
      <header className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
          Review import
        </p>
        <h1
          className="mt-1 text-3xl font-medium tracking-tight lg:text-4xl"
          style={{ fontFamily: "var(--font-display), Georgia, serif" }}
        >
          Check before saving
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Edit anything you like, then save or cancel.
        </p>
      </header>

      <div className="flex items-start justify-between gap-3">
        <label className="min-w-0 flex-1">
          <span className="mb-1.5 block text-sm font-semibold">Title</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className={fieldClass}
          />
        </label>
        {recipe.sourceUrl ? <SourceRecipeLink url={recipe.sourceUrl} /> : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full bg-[var(--chip)] px-3 py-1 text-xs font-semibold uppercase tracking-wide">
          {PROTEIN_LABELS[recipe.protein]}
        </span>
        {formatCookTime(recipe.cookTimeMin) && (
          <span className="rounded-full bg-[var(--chip)] px-3 py-1 text-xs font-semibold">
            {formatCookTime(recipe.cookTimeMin)}
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

      <EditableIngredients
        items={items}
        servings={servings}
        baseServings={baseServings}
        editing
        onServings={setServings}
        onChange={setItems}
      />

      {recipe.tools.length > 0 && (
        <p className="mt-2 text-sm text-[var(--muted)]">
          Tools: {recipe.tools.join(", ")}
        </p>
      )}

      <EditableSteps
        steps={steps}
        editing
        onChange={setSteps}
      />

      {error && <p className="mt-4 text-sm text-[var(--accent)]">{error}</p>}

      <div className="mt-6 flex gap-3 lg:justify-end">
        <button
          type="button"
          disabled={saving}
          onClick={onCancel}
          className="flex-1 rounded-2xl border border-[var(--line)] bg-[var(--card)] px-4 py-3.5 text-base font-semibold disabled:opacity-60 lg:flex-none lg:px-8 lg:transition-colors lg:hover:border-[var(--accent)]"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={saving || !title.trim()}
          onClick={() => {
            const { ingredients, pantry } = splitPantry(items);
            onSave({
              title: title.trim(),
              items: [
                ...ingredients.map((i) => ({ ...i, pantry: false as const })),
                ...pantry.map((i) => ({ ...i, pantry: true as const })),
              ],
              steps,
              servings,
            });
          }}
          className="flex-1 rounded-2xl bg-[var(--accent)] px-4 py-3.5 text-base font-semibold text-white disabled:opacity-60 lg:flex-none lg:px-8 lg:transition-colors lg:hover:bg-[var(--accent-dark)]"
        >
          {saving ? "Saving…" : "Save recipe"}
        </button>
      </div>
    </div>
  );
}

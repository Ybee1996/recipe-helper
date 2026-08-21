"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link, { useLinkStatus } from "next/link";
import { useRouter } from "next/navigation";
import {
  EditableIngredients,
  splitPantry,
  type ListedIngredient,
} from "@/components/EditableIngredients";
import { CookTimeDisplay } from "@/components/CookTimeDisplay";
import { EditableSteps } from "@/components/EditableSteps";
import { RecipeImage } from "@/components/RecipeImage";
import { FavouriteButton } from "@/components/FavouriteButton";
import { NoteEditButton, RecipeNote } from "@/components/RecipeNote";
import { useShoppingList } from "@/components/ShoppingListProvider";
import { SourceRecipeLink } from "@/components/SourceRecipeLink";
import { CalendarDatePicker } from "@/components/CalendarDatePicker";
import { useCalendar } from "@/components/CalendarProvider";
import { RecipeActionsSheet } from "@/components/RecipeActionsSheet";
import { StarRating } from "@/components/StarRating";
import { saveOverlay } from "@/lib/save-overlay";
import { displayQty } from "@/lib/filters";
import {
  combineCookTime,
  splitCookTime,
} from "@/lib/format-time";
import type { Protein, Recipe, Step } from "@/lib/types";
import { ALLERGEN_LABELS } from "@/lib/types";
import { CategoryPicker } from "@/components/CategoryPicker";
import { useCategories } from "@/components/CategoriesProvider";
import { Spinner } from "@/components/Spinner";
import { CookingView } from "@/components/CookingView";
import { TimerChipStrip } from "@/components/RecipeTimers";

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

function BackToRecipesLabel() {
  const { pending } = useLinkStatus();
  return (
    <span className="inline-flex items-center gap-1.5">
      {pending ? <Spinner size={14} /> : null}
      {pending ? "Recipes" : "← Recipes"}
    </span>
  );
}

export function RecipeDetail({ recipe }: { recipe: Recipe }) {
  const router = useRouter();
  const { labelFor } = useCategories();
  const {
    items: shoppingItems,
    addItem,
    addItems,
    removeByRecipe,
    removeByRecipeName,
    updateItemQtys,
  } = useShoppingList();
  const { isUpcoming } = useCalendar();
  const planned = isUpcoming(recipe.id);
  const scalable = recipe.source === "web";
  const defaultViewServings = scalable ? recipe.servings || 2 : 4;
  const [servings, setServings] = useState<number>(defaultViewServings);
  const [title, setTitle] = useState(recipe.title);
  const [rating, setRating] = useState<number | null>(recipe.rating ?? null);
  const [note, setNote] = useState<string | null>(recipe.note ?? null);
  const [imageUrl, setImageUrl] = useState<string | null>(recipe.imageUrl ?? null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(
    recipe.originalImageUrl ?? null,
  );
  const [protein, setProtein] = useState<Protein>(recipe.protein);
  const initialCookTime = splitCookTime(recipe.cookTimeMin);
  const [cookHours, setCookHours] = useState(String(initialCookTime.hours));
  const [cookMinutes, setCookMinutes] = useState(String(initialCookTime.minutes));
  const [items, setItems] = useState<ListedIngredient[]>(() => listedFrom(recipe));
  const [steps, setSteps] = useState<Step[]>(recipe.steps);
  const [editing, setEditing] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteEditing, setNoteEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [cookOpen, setCookOpen] = useState(false);
  const noteSectionRef = useRef<HTMLElement | null>(null);

  const storedServings = scalable ? recipe.servings || 2 : 2;
  const [yieldServings, setYieldServings] = useState(storedServings);
  const snapshot = useRef({
    title: recipe.title,
    protein: recipe.protein,
    cookHours: String(initialCookTime.hours),
    cookMinutes: String(initialCookTime.minutes),
    note: recipe.note ?? null,
    items: listedFrom(recipe),
    steps: recipe.steps,
    servings: defaultViewServings,
  });

  function handleImageChange(next: {
    imageUrl: string | null;
    originalImageUrl: string | null;
  }) {
    setImageUrl(next.imageUrl);
    setOriginalImageUrl(next.originalImageUrl);
    router.refresh();
  }

  function resetFromRecipe() {
    const cookTime = splitCookTime(recipe.cookTimeMin);
    setTitle(recipe.title);
    setRating(recipe.rating ?? null);
    setNote(recipe.note ?? null);
    setImageUrl(recipe.imageUrl ?? null);
    setOriginalImageUrl(recipe.originalImageUrl ?? null);
    setProtein(recipe.protein);
    setCookHours(String(cookTime.hours));
    setCookMinutes(String(cookTime.minutes));
    setItems(listedFrom(recipe));
    setSteps(recipe.steps);
    setEditing(false);
    setNoteOpen(false);
    setNoteEditing(false);
    setSaving(false);
    setYieldServings(storedServings);
    setServings(defaultViewServings);
  }

  useEffect(() => {
    resetFromRecipe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipe.id, recipe.servings, scalable]);

  const pushedCook = useRef(false);

  useEffect(() => {
    setCookOpen(new URLSearchParams(window.location.search).get("cook") === "1");
    function onPop() {
      pushedCook.current = false;
      setCookOpen(new URLSearchParams(window.location.search).get("cook") === "1");
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [recipe.id]);

  function openCook() {
    if (editing) return;
    setCookOpen(true);
    const url = new URL(window.location.href);
    if (url.searchParams.get("cook") === "1") return;
    url.searchParams.set("cook", "1");
    window.history.pushState(window.history.state, "", url);
    pushedCook.current = true;
  }

  function closeCook() {
    setCookOpen(false);
    const url = new URL(window.location.href);
    if (url.searchParams.get("cook") !== "1") return;
    if (pushedCook.current) {
      pushedCook.current = false;
      window.history.back();
      return;
    }
    url.searchParams.delete("cook");
    window.history.replaceState(window.history.state, "", url);
  }

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
      title,
      protein,
      cookHours,
      cookMinutes,
      note,
      items: cloneItems(items),
      steps: cloneSteps(steps),
      servings,
    };
    if (scalable) setServings(yieldServings);
    setError(null);
    setNoteOpen(false);
    setNoteEditing(false);
    setEditing(true);
    if (cookOpen) closeCook();
  }

  function cancelEditing() {
    setTitle(snapshot.current.title);
    setProtein(snapshot.current.protein);
    setCookHours(snapshot.current.cookHours);
    setCookMinutes(snapshot.current.cookMinutes);
    setNote(snapshot.current.note);
    setItems(cloneItems(snapshot.current.items));
    setSteps(cloneSteps(snapshot.current.steps));
    setServings(snapshot.current.servings);
    setError(null);
    setEditing(false);
  }

  async function saveEditing() {
    if (saving) return;
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Title is required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const { ingredients, pantry } = splitPantry(items);
      const hours = Number(cookHours) || 0;
      const minutes = Number(cookMinutes) || 0;
      const ok = await persist({
        title: trimmedTitle,
        protein,
        cookTimeMin: combineCookTime(hours, minutes),
        note: (note ?? "").trim() || null,
        ingredients,
        pantry,
        steps: steps.map((s, i) => ({ ...s, n: i + 1 })),
        ...(scalable ? { servings } : {}),
      });
      if (!ok) return;
      setTitle(trimmedTitle);
      setNote((note ?? "").trim() || null);
      if (scalable) setYieldServings(servings);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  const cookTimeMin = combineCookTime(Number(cookHours) || 0, Number(cookMinutes) || 0);
  const baseServings = scalable ? yieldServings : undefined;
  const hasNote = Boolean((note ?? "").trim());
  const showNoteButton = !editing;
  const showNote = noteOpen || (editing && hasNote);
  const noteSection = showNote ? (
    <RecipeNote
      ref={noteSectionRef}
      note={note}
      recipeEditing={editing}
      editingNote={noteEditing}
      onEditingNoteChange={setNoteEditing}
      onClose={() => {
        setNoteOpen(false);
        setNoteEditing(false);
      }}
      onChange={setNote}
      onSave={(text) => persist({ note: text })}
    />
  ) : null;

  useEffect(() => {
    if (!noteOpen) return;
    const id = window.setTimeout(() => {
      const el = noteSectionRef.current;
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      el.focus({ preventScroll: true });
    }, 50);
    return () => window.clearTimeout(id);
  }, [noteOpen]);

  const shoppingNamesFromRecipe = useMemo(() => {
    const names = new Set<string>();
    for (const item of shoppingItems) {
      if (item.recipeId === recipe.id && item.name.trim()) {
        names.add(item.name.trim());
      }
    }
    return names;
  }, [shoppingItems, recipe.id]);

  function toggleIngredientOnList(item: ListedIngredient, qty: string, onList: boolean) {
    const name = item.name.trim();
    if (!name) return;
    if (onList) {
      removeByRecipeName(recipe.id, name);
      return;
    }
    addItem({
      name,
      qty,
      recipeId: recipe.id,
      recipeTitle: title,
    });
  }

  function toggleAllIngredientsOnList(allOnList: boolean) {
    if (allOnList) {
      removeByRecipe(recipe.id);
      return;
    }
    const toAdd = items
      .filter(
        (item) =>
          !item.pantry &&
          item.name.trim() &&
          !shoppingNamesFromRecipe.has(item.name.trim()),
      )
      .map((item) => ({
        name: item.name.trim(),
        qty: displayQty(item, servings, baseServings),
        recipeId: recipe.id,
        recipeTitle: title,
      }));
    addItems(toAdd);
  }

  function scaleShoppingForServings(nextServings: number): number {
    const byName = new Map(
      items
        .filter((item) => !item.pantry && item.name.trim())
        .map((item) => [item.name.trim(), item] as const),
    );
    const updates: { id: string; qty: string }[] = [];
    for (const shopItem of shoppingItems) {
      if (shopItem.recipeId !== recipe.id) continue;
      const ingredient = byName.get(shopItem.name.trim());
      if (!ingredient) continue;
      const nextQty = displayQty(ingredient, nextServings, baseServings).trim();
      if (nextQty === shopItem.qty.trim()) continue;
      updates.push({ id: shopItem.id, qty: nextQty });
    }
    if (!updates.length) return 0;
    updateItemQtys(updates);
    return updates.length;
  }

  // The desktop rail is too narrow for the ingredient/step edit controls, so
  // editing falls back to the single-column flow at every width. Groups stay in
  // reading order in the DOM and are placed into columns explicitly, so the
  // phone layout is untouched.
  const gridClass = editing
    ? ""
    : "lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-x-10";
  const overviewClass = editing ? "" : "lg:col-start-1 lg:row-start-1";
  const railClass = editing
    ? ""
    : "lg:sticky lg:top-8 lg:col-start-2 lg:row-start-1 lg:row-end-3 lg:self-start lg:max-h-[calc(100dvh-4rem)] lg:overflow-y-auto lg:rounded-2xl lg:border lg:border-[var(--line)] lg:bg-[var(--card)] lg:p-5";
  const stepsClass = editing ? "" : "lg:col-start-1 lg:row-start-2";

  return (
    <>
    <article className="px-4 pb-8 pt-4 lg:mx-auto lg:max-w-5xl lg:px-10 lg:pb-16 lg:pt-8">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--accent)] lg:hover:underline"
        >
          <BackToRecipesLabel />
        </Link>
        <div className={`flex items-center ${editing ? "gap-2" : "gap-3"}`}>
          {editing ? (
            <>
              <button
                type="button"
                disabled={saving}
                onClick={cancelEditing}
                className="rounded-full bg-[var(--chip)] px-3.5 py-1.5 text-sm font-semibold disabled:opacity-50 lg:transition-colors lg:hover:bg-[var(--line)]"
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
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={openCook}
                className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--accent)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] lg:hover:underline"
              >
                Cook
              </button>
              <RecipeActionsSheet
                planned={planned}
                onCalendar={() => setCalendarOpen(true)}
                onEdit={startEditing}
              />
            </>
          )}
        </div>
      </div>

      {editing ? null : <TimerChipStrip sticky />}

      <div className="mt-3 flex items-start gap-1">
        <div className="min-w-0 flex-1">
          {editing ? (
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              aria-label="Recipe title"
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-1.5 text-[1.75rem] font-medium leading-tight outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] lg:text-4xl"
              style={{ fontFamily: "var(--font-display), Georgia, serif" }}
            />
          ) : (
            <h1
              className="text-[1.75rem] font-medium leading-tight lg:text-4xl"
              style={{ fontFamily: "var(--font-display), Georgia, serif" }}
            >
              {title}
              {recipe.sourceUrl ? (
                <SourceRecipeLink
                  url={recipe.sourceUrl}
                  className="ml-1 align-middle"
                />
              ) : null}
            </h1>
          )}
        </div>
        {showNoteButton ? (
          <NoteEditButton
            label={
              noteOpen
                ? "Hide note"
                : hasNote
                  ? "Show note"
                  : "Add note"
            }
            hasNote={hasNote}
            expanded={noteOpen}
            onClick={() => {
              if (noteOpen) {
                setNoteOpen(false);
                setNoteEditing(false);
                return;
              }
              setNoteOpen(true);
              setNoteEditing(false);
            }}
          />
        ) : null}
        {!editing ? (
          <FavouriteButton
            recipeId={recipe.id}
            recipeTitle={title}
            favourited={Boolean(recipe.favourite)}
            iconSize={26}
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--chip)] hover:text-[var(--accent)]"
          />
        ) : null}
      </div>

      <div className={gridClass}>
        <div className={overviewClass}>
          <div className="mt-3">
            {editing ? (
              <fieldset>
                <legend className="mb-2 text-sm font-semibold">Category</legend>
                <div className="flex flex-wrap gap-2">
                  <CategoryPicker
                    selected={protein}
                    onSelect={(id) => {
                      if (id) setProtein(id);
                    }}
                    variant="edit"
                    extraIds={[protein]}
                    selectOnCreate
                  />
                </div>
              </fieldset>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[var(--chip)] px-3 py-1 text-xs font-semibold uppercase tracking-wide">
                  {labelFor(protein)}
                </span>
                {recipe.highProtein && (
                  <span className="rounded-full bg-[var(--sage)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                    High protein
                  </span>
                )}
                {recipe.nutrition && (
                  <span className="rounded-full bg-[var(--chip)] px-3 py-1 text-xs font-semibold">
                    {recipe.nutrition.kcal} kcal · {recipe.nutrition.protein_g}g
                    protein
                  </span>
                )}
              </div>
            )}
          </div>

          {recipe.allergens.length > 0 && (
            <p className="mt-2 text-sm text-[var(--muted)]">
              Contains {recipe.allergens.map((a) => ALLERGEN_LABELS[a]).join(", ")}
            </p>
          )}

          <div className="mt-3 flex flex-col gap-3 border-y border-[var(--line)] py-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-2">
            {(editing || cookTimeMin) && (
              <>
              <div className="shrink-0">
                {editing ? (
                  <fieldset>
                    <legend className="mb-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                      Cook time
                    </legend>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min={0}
                          inputMode="numeric"
                          placeholder="0"
                          value={cookHours}
                          onChange={(e) => setCookHours(e.target.value)}
                          className="w-16 rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                        />
                        <span className="text-sm text-[var(--muted)]">hr</span>
                      </label>
                      <label className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min={0}
                          max={59}
                          inputMode="numeric"
                          placeholder="0"
                          value={cookMinutes}
                          onChange={(e) => setCookMinutes(e.target.value)}
                          className="w-16 rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                        />
                        <span className="text-sm text-[var(--muted)]">min</span>
                      </label>
                    </div>
                  </fieldset>
                ) : (
                  <CookTimeDisplay minutes={cookTimeMin} />
                )}
              </div>
              <div
                className="hidden h-9 w-px bg-[var(--line)] sm:block"
                aria-hidden="true"
              />
            </>
            )}
            <div className="min-w-0 sm:flex-1">
              <StarRating
                value={rating}
                onChange={(next) => {
                  setRating(next);
                  void persist({ rating: next });
                }}
              />
            </div>
          </div>

          {noteOpen ? noteSection : null}

          <RecipeImage
            recipeId={recipe.id}
            imageUrl={imageUrl}
            originalImageUrl={originalImageUrl}
            editing={editing}
            onChange={handleImageChange}
            onError={setError}
          />

          {editing && hasNote ? noteSection : null}

          {error && <p className="mt-3 text-sm text-[var(--accent)]">{error}</p>}
        </div>

        <div className={railClass}>
          <EditableIngredients
            items={items}
            servings={servings}
            baseServings={baseServings}
            editing={editing}
            className={editing ? "" : "lg:mt-0"}
            onServings={setServings}
            onChange={setItems}
            onToggleShoppingItem={editing ? undefined : toggleIngredientOnList}
            onToggleAllShopping={editing ? undefined : toggleAllIngredientsOnList}
            onScaleShoppingForServings={
              editing ? undefined : scaleShoppingForServings
            }
            shoppingNamesFromRecipe={shoppingNamesFromRecipe}
          />

          {recipe.tools.length > 0 && (
            <p className="mt-2 text-sm text-[var(--muted)]">
              Tools: {recipe.tools.join(", ")}
            </p>
          )}
        </div>

        <div className={stepsClass}>
          <EditableSteps
            steps={steps}
            editing={editing}
            onChange={setSteps}
            ingredients={items}
            servings={servings}
            baseServings={baseServings}
          />
        </div>
      </div>
    </article>
    <CalendarDatePicker
      open={calendarOpen}
      recipeId={recipe.id}
      recipeTitle={title}
      imageUrl={originalImageUrl || imageUrl}
      onClose={() => setCalendarOpen(false)}
    />
    <CookingView
      open={cookOpen && !editing}
      title={title}
      servings={servings}
      baseServings={baseServings}
      items={items}
      steps={steps}
      onClose={closeCook}
    />
    </>
  );
}

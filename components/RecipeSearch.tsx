"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RecipeCard } from "@/components/RecipeCard";
import { RecipeGalleryCard } from "@/components/RecipeGalleryCard";
import { StarIcon } from "@/components/FavouriteButton";
import { CategoryBar } from "@/components/CategoryBar";
import { useCalendar } from "@/components/CalendarProvider";
import { recipePhotoUrl } from "@/lib/recipe-photo";
import { searchRecipes } from "@/lib/search";
import type { Allergen, Protein, Recipe } from "@/lib/types";
import { ALLERGEN_LABELS, ALLERGENS } from "@/lib/types";

type ViewMode = "list" | "gallery";

const VIEW_STORAGE_KEY = "recipe-box-view-mode";

function isViewMode(value: string | null): value is ViewMode {
  return value === "list" || value === "gallery";
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((x) => x !== value)
    : [...list, value];
}

function FilterIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 6h16M7 12h10M10 18h4" />
    </svg>
  );
}

export function RecipeSearch({ recipes }: { recipes: Recipe[] }) {
  const router = useRouter();
  const { soonestDate } = useCalendar();
  const [query, setQuery] = useState("");
  const [proteins, setProteins] = useState<Protein[]>([]);
  const [avoidAllergens, setAvoidAllergens] = useState<Allergen[]>([]);
  const [allergyOpen, setAllergyOpen] = useState(false);
  const [archivedIds, setArchivedIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [favouritesOnly, setFavouritesOnly] = useState(false);
  const [favouriteById, setFavouriteById] = useState<Record<string, boolean>>(
    {},
  );
  const [pinnedById, setPinnedById] = useState<Record<string, boolean>>({});

  const recipesWithFavourites = useMemo(
    () =>
      recipes.map((recipe) => ({
        ...recipe,
        favourite: favouriteById[recipe.id] ?? recipe.favourite,
        pinned: pinnedById[recipe.id] ?? recipe.pinned,
      })),
    [recipes, favouriteById, pinnedById],
  );

  const extraCategoryIds = useMemo(
    () =>
      recipes
        .map((recipe) => recipe.protein)
        .filter((id) => id !== "other"),
    [recipes],
  );

  const results = useMemo(
    () =>
      searchRecipes(recipesWithFavourites, {
        query,
        proteins,
        dietary: [],
        avoidAllergens,
      })
        .filter((recipe) => !archivedIds.includes(recipe.id))
        .filter((recipe) => !favouritesOnly || recipe.favourite)
        .sort((a, b) => {
          const pinA = Number(Boolean(a.pinned));
          const pinB = Number(Boolean(b.pinned));
          if (pinB !== pinA) return pinB - pinA;
          if (pinA) return 0;
          const dateA = soonestDate(a.id);
          const dateB = soonestDate(b.id);
          if (dateA && dateB) {
            const byDate = dateA.localeCompare(dateB);
            if (byDate) return byDate;
            return a.title.localeCompare(b.title);
          }
          if (dateA) return -1;
          if (dateB) return 1;
          return 0;
        }),
    [
      recipesWithFavourites,
      query,
      proteins,
      avoidAllergens,
      archivedIds,
      favouritesOnly,
      soonestDate,
    ],
  );

  const galleryResults = useMemo(
    () => results.filter((recipe) => recipePhotoUrl(recipe)),
    [results],
  );
  const shown = viewMode === "gallery" ? galleryResults : results;

  useEffect(() => {
    const stored = localStorage.getItem(VIEW_STORAGE_KEY);
    if (isViewMode(stored)) setViewMode(stored);
  }, []);

  function chooseView(mode: ViewMode) {
    setViewMode(mode);
    localStorage.setItem(VIEW_STORAGE_KEY, mode);
  }

  useEffect(() => {
    if (!allergyOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setAllergyOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [allergyOpen]);

  function onArchived(id: string) {
    setArchivedIds((ids) => (ids.includes(id) ? ids : [...ids, id]));
    router.refresh();
  }

  function onFavouriteChange(id: string, favourite: boolean) {
    setFavouriteById((current) => ({ ...current, [id]: favourite }));
  }

  function onPinnedChange(id: string, pinned: boolean) {
    setPinnedById((current) => ({ ...current, [id]: pinned }));
  }

  const allergyOn = avoidAllergens.length > 0;

  return (
    <div className="px-4 pt-5 lg:mx-auto lg:max-w-6xl lg:px-10 lg:pt-10">
      <header className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
          Personal box
        </p>
        <h1
          className="mt-1 text-3xl font-medium tracking-tight lg:text-4xl"
          style={{ fontFamily: "var(--font-display), Georgia, serif" }}
        >
          What are we cooking?
        </h1>
      </header>

      <div className="flex items-stretch gap-2 lg:max-w-xl">
        <label className="block min-w-0 flex-1">
          <span className="sr-only">Search recipes</span>
          <input
            type="text"
            role="searchbox"
            enterKeyHint="search"
            autoCorrect="off"
            autoCapitalize="none"
            autoComplete="off"
            spellCheck="false"
            data-lpignore="true"
            data-1p-ignore="true"
            data-bwignore="true"
            placeholder="Ingredient, dish, leftover…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-2xl border border-[var(--line)] bg-[var(--card)] px-4 py-3.5 text-base outline-none ring-[var(--accent)] placeholder:text-[var(--muted)] focus:ring-2"
          />
        </label>
        <button
          type="button"
          aria-label={
            allergyOn
              ? `Allergy filters, ${avoidAllergens.length} selected`
              : "Allergy filters"
          }
          aria-expanded={allergyOpen ? "true" : "false"}
          aria-controls="allergy-filter"
          onClick={() => setAllergyOpen((open) => !open)}
          className={`relative flex w-14 shrink-0 items-center justify-center rounded-2xl border outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
            allergyOn
              ? "border-[var(--sage)] bg-[var(--sage)] text-white"
              : allergyOpen
                ? "border-[var(--line)] bg-[var(--line)] text-[var(--ink)]"
                : "border-[var(--line)] bg-[var(--card)] text-[var(--ink)] lg:hover:bg-[var(--chip)]"
          }`}
        >
          <FilterIcon />
          {allergyOn && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[11px] font-bold leading-none text-white">
              {avoidAllergens.length}
            </span>
          )}
        </button>
      </div>

      {allergyOpen && (
        <div
          id="allergy-filter"
          className="mt-3 rounded-2xl border border-[var(--line)] bg-[var(--card)] px-4 py-3 lg:max-w-xl"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-[var(--muted)]">
              Only show recipes without these allergens
            </p>
            {allergyOn && (
              <button
                type="button"
                onClick={() => setAvoidAllergens([])}
                className="shrink-0 text-sm font-semibold text-[var(--accent)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              >
                Clear
              </button>
            )}
          </div>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {ALLERGENS.map((allergen) => {
              const on = avoidAllergens.includes(allergen);
              return (
                <button
                  key={allergen}
                  type="button"
                  onClick={() =>
                    setAvoidAllergens(toggle(avoidAllergens, allergen))
                  }
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                    on
                      ? "bg-[var(--sage)] text-white"
                      : "bg-[var(--chip)] text-[var(--ink)] lg:hover:bg-[var(--line)]"
                  }`}
                >
                  {ALLERGEN_LABELS[allergen]}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <CategoryBar
        selected={proteins[0] ?? null}
        onSelect={(id) => setProteins(id ? [id] : [])}
        extraIds={extraCategoryIds}
        usageCount={(id) =>
          recipes.filter((recipe) => recipe.protein === id).length
        }
        leading={
          <button
            type="button"
            aria-label="Favourites"
            title="Favourites"
            aria-pressed={favouritesOnly}
            onClick={() => setFavouritesOnly((on) => !on)}
            className={`inline-flex h-[2.375rem] w-[2.375rem] shrink-0 items-center justify-center rounded-full outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
              favouritesOnly
                ? "bg-[var(--accent)] text-white"
                : "bg-[var(--chip)] text-[var(--ink)] lg:hover:bg-[var(--line)]"
            }`}
          >
            <StarIcon filled={favouritesOnly} size={16} />
          </button>
        }
      />

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-sm text-[var(--muted)]">
          {viewMode === "gallery"
            ? `${shown.length} recipe${shown.length === 1 ? "" : "s"} with photos`
            : `${shown.length} recipe${shown.length === 1 ? "" : "s"}`}
        </p>
        <div
          className="flex shrink-0 rounded-full bg-[var(--chip)] p-0.5"
          role="group"
          aria-label="Recipe view"
        >
          {(["list", "gallery"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={viewMode === mode}
              onClick={() => chooseView(mode)}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                viewMode === mode
                  ? "bg-[var(--ink)] text-[var(--paper)]"
                  : "text-[var(--muted)] lg:hover:text-[var(--ink)]"
              }`}
            >
              {mode === "list" ? "List" : "Gallery"}
            </button>
          ))}
        </div>
      </div>

      <ul
        className={
          viewMode === "gallery"
            ? "mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3"
            : "mt-3 space-y-3 lg:grid lg:grid-cols-2 lg:items-stretch lg:gap-4 lg:space-y-0 xl:grid-cols-3"
        }
      >
        {shown.map((recipe) => (
          <li key={recipe.id} className="h-full lg:flex">
            {viewMode === "gallery" ? (
              <RecipeGalleryCard
                recipe={recipe}
                onArchived={onArchived}
                onFavouriteChange={onFavouriteChange}
                onPinnedChange={onPinnedChange}
              />
            ) : (
              <RecipeCard
                recipe={recipe}
                onArchived={onArchived}
                onFavouriteChange={onFavouriteChange}
                onPinnedChange={onPinnedChange}
              />
            )}
          </li>
        ))}
      </ul>

      {shown.length === 0 && (
        <p className="mt-10 text-center text-[var(--muted)]">
          {favouritesOnly &&
          !query &&
          proteins.length === 0 &&
          !allergyOn
            ? viewMode === "gallery"
              ? "No favourites with photos. Switch to List, or add photos on a recipe."
              : "No favourites yet. Hold a recipe card and tap the star."
            : viewMode === "gallery"
              ? "No photos in these results. Switch to List, or add photos on a recipe."
              : "Nothing matches. Try a different ingredient or clear a filter."}
        </p>
      )}
    </div>
  );
}

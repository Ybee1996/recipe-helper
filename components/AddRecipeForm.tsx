"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImportRecipePreview } from "@/components/ImportRecipePreview";
import { splitPantry, type ListedIngredient } from "@/components/EditableIngredients";
import { CategoryPicker } from "@/components/CategoryPicker";
import { compressImage } from "@/lib/compress-image";
import { type Protein, type Recipe, type Step } from "@/lib/types";

type Mode = "url" | "photo" | "blank";

const fieldClass =
  "w-full rounded-2xl border border-[var(--line)] bg-[var(--card)] px-4 py-3.5 text-base outline-none ring-[var(--accent)] placeholder:text-[var(--muted)] focus:ring-2";

export function AddRecipeForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("url");
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [protein, setProtein] = useState<Protein>("chicken");
  const [cookTimeMin, setCookTimeMin] = useState("");
  const [ingredientsText, setIngredientsText] = useState("");
  const [stepsText, setStepsText] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Recipe | null>(null);

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview(null);
      return;
    }
    const objectUrl = URL.createObjectURL(photoFile);
    setPhotoPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [photoFile]);

  async function extractFromUrl(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/recipes/from-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = (await res.json()) as { recipe?: Recipe; error?: string };
      if (!res.ok) {
        setError(data.error || "Could not extract recipe");
        return;
      }
      if (!data.recipe) {
        setError("Could not extract recipe");
        return;
      }
      setPreview(data.recipe);
    } catch {
      setError("Could not extract recipe");
    } finally {
      setPending(false);
    }
  }

  async function extractFromPhoto(e: React.FormEvent) {
    e.preventDefault();
    if (pending || !photoFile) return;
    setError(null);
    setPending(true);
    try {
      const blob = await compressImage(photoFile, { maxEdge: 2048, quality: 0.9 });
      const form = new FormData();
      form.append("file", new File([blob], "recipe.jpg", { type: "image/jpeg" }));
      const res = await fetch("/api/recipes/from-image", {
        method: "POST",
        body: form,
      });
      const data = (await res.json()) as { recipe?: Recipe; error?: string };
      if (!res.ok) {
        setError(data.error || "Could not extract recipe");
        return;
      }
      if (!data.recipe) {
        setError("Could not extract recipe");
        return;
      }
      setPreview(data.recipe);
    } catch {
      setError("Could not extract recipe");
    } finally {
      setPending(false);
    }
  }

  async function saveManual(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          protein,
          cookTimeMin: cookTimeMin.trim() ? Number(cookTimeMin) : null,
          ingredientsText,
          stepsText,
        }),
      });
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok) {
        setError(data.error || "Could not save recipe");
        return;
      }
      if (!data.id) {
        setError("Could not save recipe");
        return;
      }
      router.push(`/recipe/${data.id}`);
      router.refresh();
    } catch {
      setError("Could not save recipe");
    } finally {
      setPending(false);
    }
  }

  async function savePreview(payload: {
    title: string;
    items: ListedIngredient[];
    steps: Step[];
    servings: number;
    photo?: { cropBlob: Blob; originalBlob: Blob } | null;
  }) {
    if (!preview || saving) return;
    setError(null);
    setSaving(true);
    try {
      const { ingredients, pantry } = splitPantry(payload.items);
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipe: {
            ...preview,
            title: payload.title,
            ingredients,
            pantry,
            steps: payload.steps.map((s, i) => ({ ...s, n: i + 1 })),
            servings: payload.servings,
          },
        }),
      });
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok) {
        setError(data.error || "Could not save recipe");
        return;
      }
      if (!data.id) {
        setError("Could not save recipe");
        return;
      }
      if (payload.photo?.cropBlob) {
        try {
          const form = new FormData();
          form.append(
            "file",
            new File([payload.photo.cropBlob], "photo.jpg", { type: "image/jpeg" }),
          );
          if (payload.photo.originalBlob) {
            form.append(
              "original",
              new File([payload.photo.originalBlob], "original.jpg", {
                type: "image/jpeg",
              }),
            );
          }
          await fetch(`/api/recipes/${data.id}/image`, {
            method: "POST",
            body: form,
          });
        } catch {
          // Recipe is saved; they can add a photo on the detail page.
        }
      }
      router.push(`/recipe/${data.id}`);
      router.refresh();
    } catch {
      setError("Could not save recipe");
    } finally {
      setSaving(false);
    }
  }

  if (preview) {
    return (
      <ImportRecipePreview
        recipe={preview}
        saving={saving}
        error={error}
        onCancel={() => {
          setPreview(null);
          setError(null);
        }}
        onSave={savePreview}
        onError={setError}
      />
    );
  }

  return (
    <form
      onSubmit={
        mode === "url"
          ? extractFromUrl
          : mode === "photo"
            ? extractFromPhoto
            : saveManual
      }
      className="px-4 pt-5 pb-8 lg:mx-auto lg:max-w-2xl lg:px-10 lg:pt-10"
    >
      <header className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
          Personal box
        </p>
        <h1
          className="mt-1 text-3xl font-medium tracking-tight lg:text-4xl"
          style={{ fontFamily: "var(--font-display), Georgia, serif" }}
        >
          Add a recipe
        </h1>
      </header>

      <div className="mb-4 flex rounded-2xl bg-[var(--chip)] p-1">
        {(
          [
            ["url", "Paste URL"],
            ["photo", "Photo"],
            ["blank", "Write it"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setMode(id);
              setError(null);
            }}
            className={`flex-1 rounded-xl px-1 py-2 text-xs font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent)] lg:text-sm ${
              mode === id
                ? "bg-[var(--card)] text-[var(--ink)] shadow-sm"
                : "text-[var(--muted)] lg:hover:text-[var(--ink)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "url" ? (
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">Recipe URL</span>
          <input
            type="url"
            inputMode="url"
            autoCapitalize="off"
            autoCorrect="off"
            placeholder="https://…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            className={fieldClass}
          />
        </label>
      ) : mode === "photo" ? (
        <div>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              setPhotoFile(file);
              setError(null);
              e.target.value = "";
            }}
          />
          {photoPreview ? (
            <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--card)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoPreview}
                alt="Recipe photo to extract"
                className="max-h-72 w-full object-contain bg-[var(--chip)]"
              />
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <p className="min-w-0 truncate text-sm text-[var(--muted)]">
                  {photoFile?.name || "Recipe photo"}
                </p>
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="shrink-0 text-sm font-semibold text-[var(--accent)]"
                >
                  Change
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-[var(--line)] bg-[var(--card)] px-4 py-10 text-center"
            >
              <span className="text-sm font-semibold">Choose a photo</span>
              <span className="text-sm text-[var(--muted)]">
                Recipe card, book page, or handwritten notes
              </span>
            </button>
          )}
          <p className="mt-2 text-sm text-[var(--muted)]">
            We&apos;ll read the ingredients and steps. Add a dish photo when you review the import.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">Title</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Dish name"
              className={fieldClass}
            />
          </label>

          <fieldset>
            <legend className="mb-1.5 text-sm font-semibold">Category</legend>
            <div className="flex flex-wrap gap-2">
              <CategoryPicker
                selected={protein}
                onSelect={(id) => {
                  if (id) setProtein(id);
                }}
                variant="form"
                selectOnCreate
              />
            </div>
          </fieldset>

          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">
              Cook time (minutes)
            </span>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              placeholder="Optional"
              value={cookTimeMin}
              onChange={(e) => setCookTimeMin(e.target.value)}
              className={fieldClass}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">Ingredients</span>
            <textarea
              rows={6}
              placeholder={"One per line, e.g.\n150g chicken\n1 onion"}
              value={ingredientsText}
              onChange={(e) => setIngredientsText(e.target.value)}
              className={`${fieldClass} resize-y`}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">Steps</span>
            <textarea
              rows={6}
              placeholder={"One per line. Optional Title: instruction"}
              value={stepsText}
              onChange={(e) => setStepsText(e.target.value)}
              className={`${fieldClass} resize-y`}
            />
          </label>
        </div>
      )}

      {error && <p className="mt-4 text-sm text-[var(--accent)]">{error}</p>}

      <div className="lg:flex lg:justify-end">
        <button
          type="submit"
          disabled={pending || (mode === "photo" && !photoFile)}
          className="mt-5 w-full rounded-2xl bg-[var(--accent)] px-4 py-3.5 text-base font-semibold text-white disabled:opacity-60 lg:w-auto lg:px-8 lg:transition-colors lg:hover:bg-[var(--accent-dark)]"
        >
          {pending
            ? mode === "blank"
              ? "Saving…"
              : "Extracting…"
            : mode === "url"
              ? "Import recipe"
              : mode === "photo"
                ? "Extract recipe"
                : "Save recipe"}
        </button>
      </div>
    </form>
  );
}

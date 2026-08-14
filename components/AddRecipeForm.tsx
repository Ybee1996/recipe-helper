"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PROTEINS, PROTEIN_LABELS, type Protein } from "@/lib/types";

type Mode = "url" | "blank";

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
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    setError(null);
    setPending(true);
    try {
      const res =
        mode === "url"
          ? await fetch("/api/recipes/from-url", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ url: url.trim() }),
            })
          : await fetch("/api/recipes", {
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

  return (
    <form onSubmit={submit} className="px-4 pt-5 pb-8">
      <header className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
          Personal box
        </p>
        <h1
          className="mt-1 text-3xl font-medium tracking-tight"
          style={{ fontFamily: "var(--font-display), Georgia, serif" }}
        >
          Add a recipe
        </h1>
      </header>

      <div className="mb-4 flex rounded-2xl bg-[var(--chip)] p-1">
        {(
          [
            ["url", "Paste URL"],
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
            className={`flex-1 rounded-xl py-2 text-sm font-semibold ${
              mode === id
                ? "bg-[var(--card)] text-[var(--ink)] shadow-sm"
                : "text-[var(--muted)]"
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
            <legend className="mb-1.5 text-sm font-semibold">Protein</legend>
            <div className="flex flex-wrap gap-2">
              {PROTEINS.map((p) => {
                const on = protein === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setProtein(p)}
                    className={`rounded-full px-3.5 py-2 text-sm font-semibold ${
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

      <button
        type="submit"
        disabled={pending}
        className="mt-5 w-full rounded-2xl bg-[var(--accent)] px-4 py-3.5 text-base font-semibold text-white disabled:opacity-60"
      >
        {pending
          ? mode === "url"
            ? "Extracting…"
            : "Saving…"
          : mode === "url"
            ? "Import recipe"
            : "Save recipe"}
      </button>
    </form>
  );
}

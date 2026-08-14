"use client";

import { useRef, useState } from "react";
import { compressImage } from "@/lib/compress-image";

function CameraIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6.2 4.25L6.85 3h4.3l.65 1.25H14.5A1.5 1.5 0 0 1 16 5.75v8A1.5 1.5 0 0 1 14.5 15.25h-11A1.5 1.5 0 0 1 2 13.75v-8a1.5 1.5 0 0 1 1.5-1.5h2.7Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle
        cx="9"
        cy="9.75"
        r="2.35"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function RecipeImage({
  recipeId,
  imageUrl,
  onChange,
  onError,
}: {
  recipeId: string;
  imageUrl: string | null;
  onChange: (url: string | null) => void;
  onError: (message: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function openPicker() {
    if (busy) return;
    inputRef.current?.click();
  }

  async function onPick(file: File | undefined) {
    if (!file) return;
    setConfirmDelete(false);
    setBusy(true);
    onError(null);
    try {
      const blob = await compressImage(file);
      const compressed = new File([blob], "photo.jpg", { type: "image/jpeg" });
      const form = new FormData();
      form.append("file", compressed);
      const res = await fetch(`/api/recipes/${recipeId}/image`, {
        method: "POST",
        body: form,
      });
      const data = (await res.json().catch(() => null)) as
        | { imageUrl?: string; error?: string }
        | null;
      if (!res.ok || !data?.imageUrl) {
        throw new Error(data?.error || "Could not save photo");
      }
      onChange(data.imageUrl);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not save photo");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove() {
    setBusy(true);
    onError(null);
    try {
      const res = await fetch(`/api/recipes/${recipeId}/image`, {
        method: "DELETE",
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        throw new Error(data?.error || "Could not remove photo");
      }
      onChange(null);
      setConfirmDelete(false);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not remove photo");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => void onPick(e.target.files?.[0])}
      />

      {imageUrl ? (
        <section className="mt-4">
          <button
            type="button"
            disabled={busy}
            onClick={openPicker}
            className="block w-full overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--card)] disabled:opacity-60"
            aria-label="Change photo"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="" className="aspect-[16/9] w-full object-cover" />
          </button>
          <div className="mt-2 flex justify-end gap-3 text-sm font-semibold">
            <button
              type="button"
              disabled={busy}
              className="text-[var(--accent)] disabled:opacity-50"
              onClick={openPicker}
            >
              {busy ? "Saving…" : "Change"}
            </button>
            {confirmDelete ? (
              <>
                <button
                  type="button"
                  disabled={busy}
                  className="text-[var(--accent)] disabled:opacity-50"
                  onClick={() => void remove()}
                >
                  Confirm
                </button>
                <button
                  type="button"
                  className="text-[var(--muted)]"
                  onClick={() => setConfirmDelete(false)}
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={busy}
                className="text-[var(--muted)] disabled:opacity-50"
                onClick={() => setConfirmDelete(true)}
              >
                Remove
              </button>
            )}
          </div>
        </section>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={openPicker}
          aria-label={busy ? "Saving photo" : "Add photo"}
          title="Add photo"
          className="inline-flex shrink-0 items-center justify-center rounded-full p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--chip)] hover:text-[var(--accent)] disabled:opacity-50"
        >
          <CameraIcon />
        </button>
      )}
    </>
  );
}

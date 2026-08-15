"use client";

import { useEffect, useRef, useState } from "react";
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

function EditIcon() {
  return (
    <svg
      width="16"
      height="16"
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

export function RecipeImage({
  recipeId,
  imageUrl,
  editing = false,
  onChange,
  onError,
}: {
  recipeId: string;
  imageUrl: string | null;
  editing?: boolean;
  onChange: (url: string | null) => void;
  onError: (message: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [portraitPhoto, setPortraitPhoto] = useState(false);

  useEffect(() => {
    if (editing) return;
    setRevealed(false);
    setMenuOpen(false);
    setConfirmDelete(false);
  }, [editing]);

  useEffect(() => {
    setPortraitPhoto(false);
  }, [imageUrl]);

  function openPicker() {
    if (busy) return;
    setMenuOpen(false);
    setConfirmDelete(false);
    inputRef.current?.click();
  }

  function onImagePointerUp(e: React.PointerEvent) {
    if (!editing || busy) return;
    if (e.pointerType !== "touch") return;
    setRevealed(true);
  }

  function toggleMenu(e: React.MouseEvent) {
    e.stopPropagation();
    if (busy) return;
    setRevealed(true);
    setConfirmDelete(false);
    setMenuOpen((open) => !open);
  }

  async function onPick(file: File | undefined) {
    if (!file) return;
    setConfirmDelete(false);
    setMenuOpen(false);
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
      setMenuOpen(false);
      setRevealed(false);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not remove photo");
    } finally {
      setBusy(false);
    }
  }

  const showEditIcon = editing && (revealed || menuOpen);

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
          <div
            className="group relative rounded-2xl border border-[var(--line)] bg-[var(--card)]"
            onPointerUp={onImagePointerUp}
          >
            <div className="aspect-[16/9] overflow-hidden rounded-2xl bg-[var(--chip)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt=""
                className={`h-full w-full ${
                  portraitPhoto ? "object-contain" : "object-cover"
                }`}
                onLoad={(e) => {
                  const { naturalWidth, naturalHeight } = e.currentTarget;
                  setPortraitPhoto(naturalHeight > naturalWidth);
                }}
              />
            </div>
            {editing ? (
              <div
                className={`absolute right-2.5 top-2.5 ${
                  showEditIcon
                    ? "opacity-100"
                    : "opacity-0 group-hover:opacity-100"
                }`}
              >
                <button
                  type="button"
                  disabled={busy}
                  onClick={toggleMenu}
                  aria-label="Edit photo"
                  title="Edit photo"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--paper)]/90 text-[var(--ink)] shadow-sm backdrop-blur-sm disabled:opacity-50"
                >
                  <EditIcon />
                </button>
                {menuOpen ? (
                  <div className="absolute right-0 top-11 z-10 min-w-[8.5rem] rounded-2xl border border-[var(--line)] bg-[var(--card)] p-1.5 text-sm font-semibold shadow-sm">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={openPicker}
                      className="block w-full rounded-xl px-3 py-2 text-left text-[var(--ink)] disabled:opacity-50"
                    >
                      {busy ? "Saving…" : "Change"}
                    </button>
                    {confirmDelete ? (
                      <>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void remove()}
                          className="block w-full rounded-xl px-3 py-2 text-left text-[var(--accent)] disabled:opacity-50"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(false)}
                          className="block w-full rounded-xl px-3 py-2 text-left text-[var(--muted)]"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setConfirmDelete(true)}
                        className="block w-full rounded-xl px-3 py-2 text-left text-[var(--muted)] disabled:opacity-50"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>
      ) : editing ? (
        <button
          type="button"
          disabled={busy}
          onClick={openPicker}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--line)] bg-[var(--card)] px-4 py-6 text-sm font-semibold text-[var(--muted)] disabled:opacity-50"
        >
          <CameraIcon />
          {busy ? "Saving…" : "Add photo"}
        </button>
      ) : null}
    </>
  );
}

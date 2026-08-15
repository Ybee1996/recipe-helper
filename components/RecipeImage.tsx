"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PhotoCropper } from "@/components/PhotoCropper";
import { canvasToJpeg, loadImageFromUrl, loadOrientedImage } from "@/lib/compress-image";

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
  originalImageUrl = null,
  editing = false,
  onChange,
  onError,
}: {
  recipeId: string;
  imageUrl: string | null;
  originalImageUrl?: string | null;
  editing?: boolean;
  onChange: (next: {
    imageUrl: string | null;
    originalImageUrl: string | null;
  }) => void;
  onError: (message: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [portraitPhoto, setPortraitPhoto] = useState(false);
  const [menuMounted, setMenuMounted] = useState(false);
  const [crop, setCrop] = useState<{
    source: HTMLCanvasElement;
    previewUrl: string;
    originalBlob: Blob | null;
  } | null>(null);

  useEffect(() => {
    setMenuMounted(true);
  }, []);

  useEffect(() => {
    if (editing) return;
    setMenuOpen(false);
    setConfirmDelete(false);
  }, [editing]);

  useEffect(() => {
    setPortraitPhoto(false);
  }, [imageUrl]);

  useEffect(() => {
    return () => {
      if (crop?.previewUrl) URL.revokeObjectURL(crop.previewUrl);
    };
  }, [crop?.previewUrl]);

  function openPicker() {
    if (busy) return;
    setMenuOpen(false);
    setConfirmDelete(false);
    inputRef.current?.click();
  }

  function toggleMenu(e: React.MouseEvent) {
    e.stopPropagation();
    if (busy) return;
    setConfirmDelete(false);
    setMenuOpen((open) => !open);
  }

  async function beginCrop(source: HTMLCanvasElement, originalBlob: Blob | null) {
    const previewUrl = URL.createObjectURL(
      originalBlob ?? (await canvasToJpeg(source)),
    );
    setCrop((prev) => {
      if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
      return { source, previewUrl, originalBlob };
    });
  }

  async function onPick(file: File | undefined) {
    if (!file) return;
    setConfirmDelete(false);
    setMenuOpen(false);
    setBusy(true);
    onError(null);
    try {
      const source = await loadOrientedImage(file);
      const originalBlob = await canvasToJpeg(source);
      await beginCrop(source, originalBlob);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not open photo");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function cropExisting() {
    const sourceUrl = originalImageUrl || imageUrl;
    if (!sourceUrl || busy) return;
    setConfirmDelete(false);
    setMenuOpen(false);
    setBusy(true);
    onError(null);
    try {
      await beginCrop(await loadImageFromUrl(sourceUrl), null);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not open photo");
    } finally {
      setBusy(false);
    }
  }

  const cropRef = useRef(crop);
  cropRef.current = crop;

  async function saveCropped(blob: Blob) {
    setBusy(true);
    onError(null);
    try {
      const form = new FormData();
      form.append("file", new File([blob], "photo.jpg", { type: "image/jpeg" }));
      if (cropRef.current?.originalBlob) {
        form.append(
          "original",
          new File([cropRef.current.originalBlob], "original.jpg", {
            type: "image/jpeg",
          }),
        );
      }
      const res = await fetch(`/api/recipes/${recipeId}/image`, {
        method: "POST",
        body: form,
      });
      const data = (await res.json().catch(() => null)) as
        | { imageUrl?: string; originalImageUrl?: string; error?: string }
        | null;
      if (!res.ok || !data?.imageUrl) {
        throw new Error(data?.error || "Could not save photo");
      }
      setCrop((prev) => {
        if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
        return null;
      });
      onChange({
        imageUrl: data.imageUrl,
        originalImageUrl: data.originalImageUrl ?? data.imageUrl,
      });
    } catch (err) {
      throw err instanceof Error ? err : new Error("Could not save photo");
    } finally {
      setBusy(false);
    }
  }

  function cancelCrop() {
    if (busy) return;
    setCrop((prev) => {
      if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
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
      onChange({ imageUrl: null, originalImageUrl: null });
      setConfirmDelete(false);
      setMenuOpen(false);
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
          <div className="relative rounded-2xl border border-[var(--line)] bg-[var(--card)]">
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
              <div className="absolute right-2.5 top-2.5 z-10">
                <button
                  type="button"
                  disabled={busy}
                  onClick={toggleMenu}
                  aria-label="Edit photo"
                  title="Edit photo"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--paper)]/90 text-[var(--ink)] shadow-sm disabled:opacity-50"
                >
                  <EditIcon />
                </button>
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
          {busy ? "Opening…" : "Add photo"}
        </button>
      ) : null}

      {menuMounted && menuOpen
        ? createPortal(
            <>
              <button
                type="button"
                className="fixed inset-0 z-[80] bg-[var(--ink)]/40"
                aria-label="Close photo menu"
                onClick={() => {
                  setMenuOpen(false);
                  setConfirmDelete(false);
                }}
              />
              <div
                role="menu"
                className="fixed inset-x-0 bottom-0 z-[90] rounded-t-3xl border-t border-[var(--line)] bg-[var(--card)] p-3 pb-[max(1rem,env(safe-area-inset-bottom))] text-sm font-semibold shadow-lg"
              >
                <p className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Photo
                </p>
                <button
                  type="button"
                  role="menuitem"
                  disabled={busy}
                  onClick={() => void cropExisting()}
                  className="block min-h-12 w-full rounded-xl px-3 py-3 text-left text-[var(--ink)] disabled:opacity-50"
                >
                  {busy ? "Opening…" : "Crop"}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  disabled={busy}
                  onClick={openPicker}
                  className="block min-h-12 w-full rounded-xl px-3 py-3 text-left text-[var(--ink)] disabled:opacity-50"
                >
                  Change
                </button>
                {confirmDelete ? (
                  <>
                    <button
                      type="button"
                      role="menuitem"
                      disabled={busy}
                      onClick={() => void remove()}
                      className="block min-h-12 w-full rounded-xl px-3 py-3 text-left text-[var(--accent)] disabled:opacity-50"
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => setConfirmDelete(false)}
                      className="block min-h-12 w-full rounded-xl px-3 py-3 text-left text-[var(--muted)]"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    role="menuitem"
                    disabled={busy}
                    onClick={() => setConfirmDelete(true)}
                    className="block min-h-12 w-full rounded-xl px-3 py-3 text-left text-[var(--muted)] disabled:opacity-50"
                  >
                    Remove
                  </button>
                )}
              </div>
            </>,
            document.body,
          )
        : null}

      {crop ? (
        <PhotoCropper
          source={crop.source}
          previewUrl={crop.previewUrl}
          busy={busy}
          onCancel={cancelCrop}
          onConfirm={saveCropped}
          onError={onError}
        />
      ) : null}
    </>
  );
}

"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CATEGORY_LABEL_MAX, parseCategoryLabel } from "@/lib/category-input";
import { useCategories } from "@/components/CategoriesProvider";
import type { CustomCategory } from "@/lib/types";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusables(root: HTMLElement) {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (el) =>
      !el.hasAttribute("disabled") &&
      el.tabIndex !== -1 &&
      el.getClientRects().length > 0,
  );
}

export function AddCategoryDialog({
  open,
  onClose,
  onAdded,
  id,
}: {
  open: boolean;
  onClose: () => void;
  onAdded?: (category: CustomCategory) => void;
  id?: string;
}) {
  const { categories, addCategory } = useCategories();
  const titleId = useId();
  const inputId = useId();
  const errorId = useId();
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setName("");
      setError(null);
      setPending(false);
      setKeyboardInset(0);
      return;
    }
    previousFocus.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 50);

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const items = focusables(dialogRef.current);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !dialogRef.current.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (active === last || !dialogRef.current.contains(active))
      ) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      previousFocus.current?.focus();
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const vv = window.visualViewport;
    if (!vv) return;

    const measure = () => {
      if (window.matchMedia("(min-width: 1024px)").matches) {
        setKeyboardInset(0);
        return;
      }
      const inset = Math.round(window.innerHeight - vv.height - vv.offsetTop);
      setKeyboardInset(inset > 80 ? inset : 0);
    };

    measure();
    vv.addEventListener("resize", measure);
    vv.addEventListener("scroll", measure);
    return () => {
      vv.removeEventListener("resize", measure);
      vv.removeEventListener("scroll", measure);
    };
  }, [open]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;

    const parsed = parseCategoryLabel(name);
    if ("error" in parsed) {
      setError(parsed.error);
      inputRef.current?.focus();
      return;
    }
    const clash = categories.find(
      (c) =>
        c.id === parsed.id ||
        c.label.toLowerCase() === parsed.label.toLowerCase(),
    );
    if (clash) {
      setError(`${clash.label} is already a category`);
      inputRef.current?.focus();
      return;
    }

    setPending(true);
    setError(null);
    try {
      const created = await addCategory(name);
      onAdded?.(created);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add category");
      inputRef.current?.focus();
    } finally {
      setPending(false);
    }
  }

  if (!mounted || !open) return null;

  return createPortal(
    <>
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close"
        className="fixed inset-0 z-[45] bg-[var(--ink)]/40"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        id={id}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="fixed z-[46] bg-[var(--card)] shadow-lg outline-none max-lg:inset-x-0 max-lg:bottom-0 max-lg:rounded-t-3xl max-lg:border-t max-lg:border-[var(--line)] max-lg:px-5 max-lg:pb-[max(1.25rem,env(safe-area-inset-bottom))] max-lg:pt-3 lg:left-1/2 lg:top-1/2 lg:w-full lg:max-w-md lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-3xl lg:border lg:border-[var(--line)] lg:p-6"
        style={
          keyboardInset
            ? { bottom: keyboardInset, paddingBottom: "1.25rem" }
            : undefined
        }
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[var(--line)] lg:hidden" />
        <h2
          id={titleId}
          className="text-xl font-medium tracking-tight"
          style={{ fontFamily: "var(--font-display), Georgia, serif" }}
        >
          New category
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Adds a chip next to Pork, Beef, and the rest.
        </p>
        <form className="mt-4" onSubmit={submit}>
          <label htmlFor={inputId} className="mb-1.5 block text-sm font-semibold">
            Name
          </label>
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            value={name}
            maxLength={CATEGORY_LABEL_MAX}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="words"
            spellCheck={false}
            enterKeyHint="done"
            placeholder="e.g. Lamb"
            aria-invalid={error ? "true" : "false"}
            aria-describedby={error ? errorId : undefined}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError(null);
            }}
            className="w-full rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3.5 text-base outline-none ring-[var(--accent)] placeholder:text-[var(--muted)] focus:ring-2"
          />
          {error ? (
            <p id={errorId} className="mt-2 text-sm text-[var(--accent)]" role="alert">
              {error}
            </p>
          ) : (
            <p className="mt-2 text-xs text-[var(--muted)]">
              {name.trim().length}/{CATEGORY_LABEL_MAX}
            </p>
          )}
          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-2xl border border-[var(--line)] bg-[var(--card)] px-4 py-3.5 text-base font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] lg:hover:bg-[var(--chip)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending || !name.trim()}
              className="flex-1 rounded-2xl bg-[var(--accent)] px-4 py-3.5 text-base font-semibold text-white outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-60 lg:hover:bg-[var(--accent-dark)]"
            >
              {pending ? "Adding…" : "Add"}
            </button>
          </div>
        </form>
      </div>
    </>,
    document.body,
  );
}

"use client";

import { useEffect, useState } from "react";

function NoteIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 18 18"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5.5 2.75h7A1.25 1.25 0 0 1 13.75 4v11A1.25 1.25 0 0 1 12.5 16.25h-7A1.25 1.25 0 0 1 4.25 15V4A1.25 1.25 0 0 1 5.5 2.75Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M7 6.5h4M7 9h4M7 11.5h2.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

const editButtonClass =
  "inline-flex shrink-0 items-center justify-center rounded-full p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--chip)] hover:text-[var(--accent)]";

export function NoteEditButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={editButtonClass}
    >
      <NoteIcon />
    </button>
  );
}

export function RecipeNote({
  note,
  recipeEditing,
  editingNote,
  onEditingNoteChange,
  onChange,
  onSave,
}: {
  note: string | null;
  recipeEditing: boolean;
  editingNote: boolean;
  onEditingNoteChange: (editing: boolean) => void;
  onChange: (text: string | null) => void;
  onSave: (text: string | null) => Promise<boolean>;
}) {
  const existing = (note ?? "").trim();
  const [draft, setDraft] = useState(note ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editingNote) setDraft(note ?? "");
  }, [note, editingNote]);

  function cancelEditing() {
    setDraft(note ?? "");
    onEditingNoteChange(false);
  }

  async function saveNote() {
    if (saving) return;
    setSaving(true);
    const trimmed = draft.trim();
    const next = trimmed || null;
    const ok = await onSave(next);
    setSaving(false);
    if (!ok) return;
    onChange(next);
    onEditingNoteChange(false);
  }

  if (recipeEditing) {
    if (!existing) return null;
    return (
      <section className="mt-6">
        <h2 className="text-lg font-semibold">Note</h2>
        <p className="mt-2 whitespace-pre-wrap rounded-2xl border border-[var(--line)] bg-[var(--card)] px-4 py-3 text-[0.95rem] leading-relaxed">
          {existing}
        </p>
      </section>
    );
  }

  if (editingNote) {
    return (
      <section className="mt-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Note</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={cancelEditing}
              className="rounded-full bg-[var(--chip)] px-2.5 py-1 text-xs font-semibold disabled:opacity-50 lg:transition-colors lg:hover:bg-[var(--line)]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveNote()}
              className="rounded-full bg-[var(--ink)] px-2.5 py-1 text-xs font-semibold text-[var(--paper)] disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          autoFocus
          placeholder="Swaps, leftovers, what you'd change next time…"
          className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[var(--card)] px-3 py-3 text-[0.95rem] leading-relaxed outline-none ring-[var(--accent)] focus:ring-2"
        />
      </section>
    );
  }

  if (!existing) return null;

  return (
    <section className="mt-6">
      <h2 className="text-lg font-semibold">Note</h2>
      <p className="mt-2 whitespace-pre-wrap rounded-2xl border border-[var(--line)] bg-[var(--card)] px-4 py-3 text-[0.95rem] leading-relaxed">
        {existing}
      </p>
    </section>
  );
}

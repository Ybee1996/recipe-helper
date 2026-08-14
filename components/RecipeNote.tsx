"use client";

import { useState } from "react";

export function RecipeNote({
  note,
  onSave,
  onDelete,
}: {
  note: string | null;
  onSave: (text: string) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const existing = (note ?? "").trim();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(existing);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  async function save() {
    const text = draft.trim();
    if (!text) return;
    setBusy(true);
    try {
      await onSave(text);
      setEditing(false);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await onDelete();
      setDraft("");
      setConfirmDelete(false);
      setEditing(false);
    } finally {
      setBusy(false);
    }
  }

  if (!existing && !editing) {
    return (
      <section className="mt-6">
        <button
          type="button"
          onClick={() => {
            setDraft("");
            setEditing(true);
          }}
          className="text-sm font-semibold text-[var(--accent)]"
        >
          + Add a note
        </button>
      </section>
    );
  }

  return (
    <section className="mt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Note</h2>
        {existing && !editing && (
          <div className="flex gap-3 text-sm font-semibold">
            <button
              type="button"
              className="text-[var(--accent)]"
              onClick={() => {
                setDraft(existing);
                setConfirmDelete(false);
                setEditing(true);
              }}
            >
              Edit
            </button>
            {confirmDelete ? (
              <>
                <button
                  type="button"
                  disabled={busy}
                  className="text-[var(--accent)]"
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
                className="text-[var(--muted)]"
                onClick={() => setConfirmDelete(true)}
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>

      {editing ? (
        <div className="mt-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={4}
            placeholder="Swaps, leftovers, what you'd change next time…"
            className="w-full rounded-2xl border border-[var(--line)] bg-[var(--card)] px-3 py-3 text-[0.95rem] leading-relaxed outline-none ring-[var(--accent)] focus:ring-2"
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={busy || !draft.trim()}
              onClick={() => void save()}
              className="rounded-full bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-[var(--paper)] disabled:opacity-50"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setDraft(existing);
              }}
              className="rounded-full bg-[var(--chip)] px-4 py-2 text-sm font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-2 whitespace-pre-wrap rounded-2xl border border-[var(--line)] bg-[var(--card)] px-4 py-3 text-[0.95rem] leading-relaxed">
          {existing}
        </p>
      )}
    </section>
  );
}

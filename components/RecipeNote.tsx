"use client";

export function RecipeNote({
  note,
  editing,
  onChange,
}: {
  note: string | null;
  editing: boolean;
  onChange: (text: string) => void;
}) {
  const existing = (note ?? "").trim();

  if (!editing) {
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

  return (
    <section className="mt-6">
      <h2 className="text-lg font-semibold">Note</h2>
      <textarea
        value={note ?? ""}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        placeholder="Swaps, leftovers, what you'd change next time…"
        className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[var(--card)] px-3 py-3 text-[0.95rem] leading-relaxed outline-none ring-[var(--accent)] focus:ring-2"
      />
    </section>
  );
}

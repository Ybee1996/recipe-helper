"use client";

import type { Step } from "@/lib/types";

export function EditableSteps({
  steps,
  editing,
  onToggleEdit,
  onChange,
}: {
  steps: Step[];
  editing: boolean;
  onToggleEdit: () => void;
  onChange: (steps: Step[]) => void;
}) {
  function update(index: number, next: Step) {
    onChange(steps.map((step, i) => (i === index ? next : step)));
  }

  function move(index: number, dir: -1 | 1) {
    const next = index + dir;
    if (next < 0 || next >= steps.length) return;
    const copy = [...steps];
    const [item] = copy.splice(index, 1);
    copy.splice(next, 0, item);
    onChange(copy.map((s, i) => ({ ...s, n: i + 1 })));
  }

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Steps</h2>
        <button
          type="button"
          onClick={onToggleEdit}
          className="text-sm font-semibold text-[var(--accent)]"
        >
          {editing ? "Done" : "Edit"}
        </button>
      </div>

      {editing ? (
        <ul className="mt-3 space-y-3">
          {steps.map((step, index) => (
            <li
              key={index}
              className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-[var(--accent)] text-sm font-bold text-white">
                  {index + 1}
                </span>
                <div className="flex gap-2 text-sm font-semibold">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                    className="text-[var(--muted)] disabled:opacity-30"
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    disabled={index === steps.length - 1}
                    onClick={() => move(index, 1)}
                    className="text-[var(--muted)] disabled:opacity-30"
                  >
                    Down
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onChange(
                        steps
                          .filter((_, i) => i !== index)
                          .map((s, i) => ({ ...s, n: i + 1 })),
                      )
                    }
                    className="text-[var(--accent)]"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <input
                value={step.title}
                onChange={(e) => update(index, { ...step, title: e.target.value })}
                placeholder="Step title"
                className="mt-2 w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-sm font-semibold outline-none ring-[var(--accent)] focus:ring-2"
              />
              <textarea
                value={step.text}
                onChange={(e) => update(index, { ...step, text: e.target.value })}
                placeholder="What to do"
                rows={3}
                className="mt-2 w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-sm leading-relaxed outline-none ring-[var(--accent)] focus:ring-2"
              />
            </li>
          ))}
        </ul>
      ) : (
        <ol className="mt-3 space-y-5">
          {steps.map((step, index) => (
            <li key={index} className="flex gap-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--accent)] text-sm font-bold text-white">
                {index + 1}
              </span>
              <div>
                <h3 className="font-semibold">{step.title}</h3>
                <p className="mt-1 text-[0.95rem] leading-relaxed text-[var(--ink)]/90">
                  {step.text}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}

      {editing && (
        <button
          type="button"
          onClick={() =>
            onChange([
              ...steps,
              { n: steps.length + 1, title: "", text: "" },
            ])
          }
          className="mt-3 text-sm font-semibold text-[var(--accent)]"
        >
          + Add step
        </button>
      )}
    </section>
  );
}

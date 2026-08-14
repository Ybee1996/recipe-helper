"use client";

export function StarRating({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (rating: number) => void;
}) {
  const rating = value ?? 0;

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
        Your rating
      </p>
      <div
        className="mt-1.5 flex justify-between"
        role="radiogroup"
        aria-label="Rating out of 10"
      >
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
          const filled = n <= rating;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={n === rating}
              aria-label={`${n} out of 10`}
              onClick={() => onChange(n)}
              className={`flex h-9 w-9 items-center justify-center text-[1.35rem] leading-none ${
                filled ? "text-[var(--accent)]" : "text-[var(--line)]"
              }`}
            >
              ★
            </button>
          );
        })}
      </div>
      <p className="mt-0.5 text-right text-xs font-semibold text-[var(--muted)]">
        {rating ? `${rating}/10` : "Tap a star"}
      </p>
    </div>
  );
}

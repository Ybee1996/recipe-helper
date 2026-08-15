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
      <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <div
          className="grid w-[min(100%,17.5rem)] grid-cols-10 sm:w-[20rem]"
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
                className={`flex aspect-square items-center justify-center rounded-full text-[1.1rem] leading-none outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent)] sm:text-[1.25rem] lg:hover:text-[var(--accent)] ${
                  filled ? "text-[var(--accent)]" : "text-[var(--line)]"
                }`}
              >
                ★
              </button>
            );
          })}
        </div>
        <p className="text-xs font-semibold text-[var(--muted)]">
          {rating ? (
            `${rating}/10`
          ) : (
            <>
              <span className="lg:hidden">Tap a star</span>
              <span className="hidden lg:inline">Click a star</span>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

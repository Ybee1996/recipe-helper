import { formatCookTime } from "@/lib/format-time";

function ClockIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className="mt-0.5 shrink-0 text-[var(--accent)]"
    >
      <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M8 4.75V8l2.25 1.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CookTimeDisplay({
  minutes,
  compact = false,
}: {
  minutes: number | null | undefined;
  compact?: boolean;
}) {
  const label = formatCookTime(minutes);
  if (!label) return null;

  if (compact) {
    return (
      <span className="text-xs font-semibold text-[var(--accent)]">{label}</span>
    );
  }

  return (
    <div className="flex items-start gap-2">
      <ClockIcon />
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
          Cook time
        </p>
        <p
          className="mt-0.5 text-lg font-semibold leading-none text-[var(--accent)]"
          style={{ fontFamily: "var(--font-display), Georgia, serif" }}
        >
          {label}
        </p>
      </div>
    </div>
  );
}

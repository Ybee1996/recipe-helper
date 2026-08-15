import { formatCookTime } from "@/lib/format-time";

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
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
        Cook time
      </p>
      <p className="mt-1.5 text-[1.35rem] font-semibold leading-none text-[var(--accent)]">
        {label}
      </p>
    </div>
  );
}

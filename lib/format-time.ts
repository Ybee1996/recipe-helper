export function formatCookTime(min: number | null | undefined): string | null {
  if (min == null || min <= 0) return null;
  const total = Math.round(min);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} hr`;
  return `${h} hr ${m} min`;
}

export function splitCookTime(min: number | null | undefined): {
  hours: number;
  minutes: number;
} {
  if (min == null || min <= 0) return { hours: 0, minutes: 0 };
  const total = Math.round(min);
  return { hours: Math.floor(total / 60), minutes: total % 60 };
}

export function combineCookTime(hours: number, minutes: number): number | null {
  const h = Math.max(0, Math.round(hours));
  const m = Math.max(0, Math.round(minutes));
  const total = h * 60 + m;
  return total > 0 ? total : null;
}

export interface CalendarEntry {
  id: string;
  recipeId: string;
  cookDate: string;
  title: string;
  imageUrl?: string | null;
}

export interface CalendarRecipeOption {
  id: string;
  title: string;
  imageUrl?: string | null;
}

export type CalendarOp =
  | { op: "add"; entry: CalendarEntry }
  | { op: "remove"; ids: string[] }
  | { op: "removeByRecipe"; recipeId: string }
  | { op: "removeUpcomingByRecipe"; recipeId: string; today: string };

/**
 * Cook dates are civil days (YYYY-MM-DD), not timestamps.
 * Do not convert them through UTC (`toISOString`, `new Date("YYYY-MM-DD")`).
 * "Today" is the viewer's local calendar day; stored values are timezone-independent.
 */
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
/** DATE-only values some drivers encode as UTC midnight. */
const DATE_AS_UTC_MIDNIGHT_RE =
  /^(\d{4})-(\d{2})-(\d{2})(?:[ T]00:00:00(?:\.\d+)?(?:Z|[+-]00:00)?)$/;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function ymd(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function isValidCivilDate(value: string): boolean {
  const match = value.match(DATE_RE);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(year, month - 1, day);
  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
  );
}

export function isCalendarDate(value: unknown): value is string {
  return typeof value === "string" && isValidCivilDate(value);
}

export function isCalendarEntry(value: unknown): value is CalendarEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as CalendarEntry;
  return (
    typeof entry.id === "string" &&
    entry.id.length > 0 &&
    entry.id.length <= 80 &&
    typeof entry.recipeId === "string" &&
    entry.recipeId.length > 0 &&
    entry.recipeId.length <= 120 &&
    isCalendarDate(entry.cookDate) &&
    typeof entry.title === "string" &&
    (entry.imageUrl === undefined ||
      entry.imageUrl === null ||
      typeof entry.imageUrl === "string")
  );
}

export function isCalendarRecipeOption(
  value: unknown,
): value is CalendarRecipeOption {
  if (!value || typeof value !== "object") return false;
  const recipe = value as CalendarRecipeOption;
  return (
    typeof recipe.id === "string" &&
    recipe.id.length > 0 &&
    typeof recipe.title === "string" &&
    (recipe.imageUrl === undefined ||
      recipe.imageUrl === null ||
      typeof recipe.imageUrl === "string")
  );
}

export function cookDateFromDb(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (isValidCivilDate(trimmed)) return trimmed;
    const utcMidnight = trimmed.match(DATE_AS_UTC_MIDNIGHT_RE);
    if (utcMidnight) {
      const date = `${utcMidnight[1]}-${utcMidnight[2]}-${utcMidnight[3]}`;
      return isValidCivilDate(date) ? date : null;
    }
    return null;
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const utcMidnight =
      value.getUTCHours() === 0 &&
      value.getUTCMinutes() === 0 &&
      value.getUTCSeconds() === 0 &&
      value.getUTCMilliseconds() === 0;
    if (utcMidnight) {
      const date = ymd(
        value.getUTCFullYear(),
        value.getUTCMonth() + 1,
        value.getUTCDate(),
      );
      return isValidCivilDate(date) ? date : null;
    }
    const localMidnight =
      value.getHours() === 0 &&
      value.getMinutes() === 0 &&
      value.getSeconds() === 0 &&
      value.getMilliseconds() === 0;
    if (localMidnight) {
      const date = toCalendarDate(value);
      return isValidCivilDate(date) ? date : null;
    }
    return null;
  }
  return null;
}

export function todayDate(now = new Date()): string {
  return toCalendarDate(now);
}

export function toCalendarDate(date: Date): string {
  return ymd(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

export function parseCalendarDate(value: string): Date {
  const match = value.match(DATE_RE);
  if (!match) return new Date(NaN);
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function startOfWeekMonday(date: Date): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const weekday = start.getDay();
  start.setDate(start.getDate() + (weekday === 0 ? -6 : 1 - weekday));
  return start;
}

export function weekDates(anchor: Date): string[] {
  const start = startOfWeekMonday(anchor);
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    return toCalendarDate(day);
  });
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + days);
  return next;
}

export function addMonths(date: Date, months: number): Date {
  const next = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const day = Math.min(
    date.getDate(),
    daysInMonth(next.getFullYear(), next.getMonth()),
  );
  next.setDate(day);
  return next;
}

export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function monthGrid(year: number, monthIndex: number): (string | null)[] {
  const first = new Date(year, monthIndex, 1);
  const weekday = first.getDay();
  const leading = weekday === 0 ? 6 : weekday - 1;
  const count = daysInMonth(year, monthIndex);
  const cells: (string | null)[] = Array.from({ length: leading }, () => null);
  for (let day = 1; day <= count; day++) {
    cells.push(toCalendarDate(new Date(year, monthIndex, day)));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function isSameMonth(date: Date, year: number, monthIndex: number): boolean {
  return date.getFullYear() === year && date.getMonth() === monthIndex;
}

export function isCurrentWeek(anchor: Date, now = new Date()): boolean {
  return toCalendarDate(startOfWeekMonday(anchor)) ===
    toCalendarDate(startOfWeekMonday(now));
}

export function formatWeekRange(anchor: Date): string {
  const days = weekDates(anchor).map(parseCalendarDate);
  const start = days[0];
  const end = days[6];
  const startMonth = start.toLocaleDateString("en-GB", { month: "short" });
  const endMonth = end.toLocaleDateString("en-GB", { month: "short" });
  if (start.getFullYear() !== end.getFullYear()) {
    return `${start.getDate()} ${startMonth} ${start.getFullYear()} – ${end.getDate()} ${endMonth} ${end.getFullYear()}`;
  }
  if (startMonth === endMonth) {
    return `${start.getDate()}–${end.getDate()} ${endMonth} ${end.getFullYear()}`;
  }
  return `${start.getDate()} ${startMonth} – ${end.getDate()} ${endMonth} ${end.getFullYear()}`;
}

export function formatMonthTitle(year: number, monthIndex: number): string {
  return new Date(year, monthIndex, 1).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

export function formatDayHeading(date: string): string {
  const parsed = parseCalendarDate(date);
  return parsed.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}

export function weekdayLabels(): string[] {
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
}

export function soonestUpcomingDate(
  entries: readonly CalendarEntry[],
  recipeId: string,
  today: string,
): string | null {
  const dates = entries
    .filter((entry) => entry.recipeId === recipeId && entry.cookDate >= today)
    .map((entry) => entry.cookDate)
    .sort();
  return dates[0] ?? null;
}

export function entriesOnDate(
  entries: readonly CalendarEntry[],
  date: string,
): CalendarEntry[] {
  return entries.filter((entry) => entry.cookDate === date);
}

export function upcomingCount(entries: readonly CalendarEntry[], today: string): number {
  return entries.filter((entry) => entry.cookDate >= today).length;
}

function newEntryId(): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return uuid;
  const bytes = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function newCalendarEntry(
  input: Omit<CalendarEntry, "id"> & { id?: string },
): CalendarEntry {
  return {
    id: input.id ?? newEntryId(),
    recipeId: input.recipeId,
    cookDate: input.cookDate,
    title: input.title,
    imageUrl: input.imageUrl ?? null,
  };
}

export function calendarEntriesEqual(
  a: CalendarEntry[],
  b: CalendarEntry[],
): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function parsePayload(value: unknown): {
  entries: CalendarEntry[];
  recipes: CalendarRecipeOption[];
} {
  if (!value || typeof value !== "object") {
    return { entries: [], recipes: [] };
  }
  const raw = value as { entries?: unknown; recipes?: unknown };
  return {
    entries: Array.isArray(raw.entries)
      ? raw.entries.filter(isCalendarEntry)
      : [],
    recipes: Array.isArray(raw.recipes)
      ? raw.recipes.filter(isCalendarRecipeOption)
      : [],
  };
}

export async function fetchCalendar(): Promise<{
  entries: CalendarEntry[];
  recipes: CalendarRecipeOption[];
}> {
  const res = await fetch("/api/calendar", { cache: "no-store" });
  if (!res.ok) throw new Error("Could not load calendar");
  return parsePayload(await res.json());
}

export async function postCalendarOp(
  op: CalendarOp,
): Promise<{
  entries: CalendarEntry[];
  recipes: CalendarRecipeOption[];
}> {
  const res = await fetch("/api/calendar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify(op),
  });
  if (!res.ok) throw new Error("Could not save calendar");
  return parsePayload(await res.json());
}

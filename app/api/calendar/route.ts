import { NextResponse } from "next/server";
import {
  isCalendarDate,
  isCalendarEntry,
  type CalendarOp,
} from "@/lib/calendar";
import { applyCalendarOp, loadCalendar } from "@/lib/calendar-store";

export const dynamic = "force-dynamic";

function parseOp(body: unknown): CalendarOp | null {
  if (!body || typeof body !== "object") return null;
  const raw = body as { op?: unknown };

  switch (raw.op) {
    case "add": {
      const entry = (raw as { entry?: unknown }).entry;
      if (!isCalendarEntry(entry)) return null;
      return { op: "add", entry };
    }
    case "remove": {
      const ids = (raw as { ids?: unknown }).ids;
      if (
        !Array.isArray(ids) ||
        ids.length === 0 ||
        ids.length > 200 ||
        !ids.every(
          (id) => typeof id === "string" && id.length > 0 && id.length <= 80,
        )
      ) {
        return null;
      }
      return { op: "remove", ids };
    }
    case "removeByRecipe": {
      const recipeId = (raw as { recipeId?: unknown }).recipeId;
      if (typeof recipeId !== "string" || !recipeId || recipeId.length > 120) {
        return null;
      }
      return { op: "removeByRecipe", recipeId };
    }
    case "removeUpcomingByRecipe": {
      const { recipeId, today } = raw as { recipeId?: unknown; today?: unknown };
      if (typeof recipeId !== "string" || !recipeId || recipeId.length > 120) {
        return null;
      }
      if (!isCalendarDate(today)) return null;
      return { op: "removeUpcomingByRecipe", recipeId, today };
    }
    default:
      return null;
  }
}

export async function GET() {
  return NextResponse.json(await loadCalendar());
}

export async function POST(req: Request) {
  const op = parseOp(await req.json().catch(() => null));
  if (!op) {
    return NextResponse.json({ error: "Invalid calendar update" }, { status: 400 });
  }
  return NextResponse.json(await applyCalendarOp(op));
}

import { NextResponse } from "next/server";
import { createCategory, loadCategories } from "@/lib/categories";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await loadCategories());
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { label?: unknown } | null;
  const result = await createCategory(body?.label);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result, { status: 201 });
}

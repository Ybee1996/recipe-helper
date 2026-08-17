import { NextResponse } from "next/server";
import {
  createCategory,
  loadCategories,
  loadCategoryOrder,
  saveCategoryOrder,
} from "@/lib/categories";

export const dynamic = "force-dynamic";

export async function GET() {
  const [categories, order] = await Promise.all([
    loadCategories(),
    loadCategoryOrder(),
  ]);
  return NextResponse.json({ categories, order });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { label?: unknown } | null;
  const result = await createCategory(body?.label);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result, { status: 201 });
}

export async function PATCH(req: Request) {
  const body = (await req.json().catch(() => null)) as { order?: unknown } | null;
  if (!body || !("order" in body)) {
    return NextResponse.json({ error: "Order is required" }, { status: 400 });
  }
  const result = await saveCategoryOrder(body.order);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ order: result });
}

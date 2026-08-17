import { NextResponse } from "next/server";
import { deleteCategory } from "@/lib/categories";
import { isProtein } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!isProtein(id)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }
  const result = await deleteCategory(id);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result);
}

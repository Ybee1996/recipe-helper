import { NextResponse } from "next/server";
import { archiveRecipe } from "@/lib/recipes";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const archived = await archiveRecipe(id);
  if (!archived) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }
  return NextResponse.json({ archived: true });
}

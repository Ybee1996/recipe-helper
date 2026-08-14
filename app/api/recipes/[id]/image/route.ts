import { del, put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { getRecipe } from "@/lib/recipes";
import { getOverlay, patchOverlay } from "@/lib/user-store";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const MAX_BYTES = 4 * 1024 * 1024;

async function deleteBlob(url: string | null | undefined) {
  if (!url) return;
  try {
    await del(url);
  } catch {
    // previous blob may already be gone
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!(await getRecipe(id))) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "Photo storage is not configured" },
      { status: 503 },
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof Blob) || file.size === 0) {
    return NextResponse.json({ error: "Choose a photo" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Photo must be JPEG, PNG, or WebP" },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Photo is too large" }, { status: 400 });
  }

  const previousUrl = (await getOverlay(id)).imageUrl ?? null;
  const pathname = `recipes/${id.replace(/[^a-zA-Z0-9_-]/g, "_")}/${Date.now()}.jpg`;

  let blob: { url: string };
  try {
    blob = await put(pathname, file, {
      access: "public",
      contentType: "image/jpeg",
      addRandomSuffix: true,
    });
  } catch {
    return NextResponse.json({ error: "Could not save photo" }, { status: 500 });
  }

  try {
    await patchOverlay(id, { imageUrl: blob.url });
  } catch (err) {
    await deleteBlob(blob.url);
    throw err;
  }
  await deleteBlob(previousUrl);

  return NextResponse.json({ imageUrl: blob.url });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!(await getRecipe(id))) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  const previousUrl = (await getOverlay(id)).imageUrl ?? null;
  await patchOverlay(id, { imageUrl: null });
  await deleteBlob(previousUrl);

  return NextResponse.json({ imageUrl: null });
}

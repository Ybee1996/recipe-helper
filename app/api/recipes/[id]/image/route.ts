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

async function deleteBlobs(urls: Array<string | null | undefined>) {
  const unique = [...new Set(urls.filter((url): url is string => Boolean(url)))];
  await Promise.all(unique.map(deleteBlob));
}

function isPhoto(file: FormDataEntryValue | null): file is File {
  return file instanceof Blob && file.size > 0;
}

function photoError(file: Blob): string | null {
  if (!ALLOWED_TYPES.has(file.type)) return "Photo must be JPEG, PNG, or WebP";
  if (file.size > MAX_BYTES) return "Photo is too large";
  return null;
}

async function putJpeg(id: string, file: Blob, kind: "crop" | "original") {
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, "_");
  const pathname = `recipes/${safeId}/${kind}-${Date.now()}.jpg`;
  return put(pathname, file, {
    access: "public",
    contentType: "image/jpeg",
    addRandomSuffix: true,
  });
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
  const original = form.get("original");
  if (!isPhoto(file)) {
    return NextResponse.json({ error: "Choose a photo" }, { status: 400 });
  }
  const fileError = photoError(file);
  if (fileError) {
    return NextResponse.json({ error: fileError }, { status: 400 });
  }
  if (original != null && original !== "") {
    if (!isPhoto(original)) {
      return NextResponse.json({ error: "Choose a photo" }, { status: 400 });
    }
    const originalError = photoError(original);
    if (originalError) {
      return NextResponse.json({ error: originalError }, { status: 400 });
    }
  }

  const overlay = await getOverlay(id);
  const previousCrop = overlay.imageUrl ?? null;
  const previousOriginal = overlay.originalImageUrl ?? null;
  const replacingOriginal = isPhoto(original);

  let originalBlob: { url: string } | null = null;
  let cropBlob: { url: string };
  try {
    if (replacingOriginal) {
      originalBlob = await putJpeg(id, original, "original");
    }
    cropBlob = await putJpeg(id, file, "crop");
  } catch {
    await deleteBlobs([originalBlob?.url]);
    return NextResponse.json({ error: "Could not save photo" }, { status: 500 });
  }

  const originalImageUrl = originalBlob?.url ?? previousOriginal ?? previousCrop;

  try {
    await patchOverlay(id, {
      imageUrl: cropBlob.url,
      originalImageUrl,
    });
  } catch (err) {
    await deleteBlobs([cropBlob.url, originalBlob?.url]);
    throw err;
  }

  const keep = new Set([cropBlob.url, originalImageUrl]);
  await deleteBlobs(
    replacingOriginal
      ? [previousCrop, previousOriginal].filter((url) => url && !keep.has(url))
      : [previousCrop].filter((url) => url && !keep.has(url)),
  );

  return NextResponse.json({
    imageUrl: cropBlob.url,
    originalImageUrl,
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!(await getRecipe(id))) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  const overlay = await getOverlay(id);
  await patchOverlay(id, { imageUrl: null, originalImageUrl: null });
  await deleteBlobs([overlay.imageUrl, overlay.originalImageUrl]);

  return NextResponse.json({ imageUrl: null, originalImageUrl: null });
}

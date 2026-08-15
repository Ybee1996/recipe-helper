const MAX_EDGE = 1200;
const JPEG_QUALITY = 0.8;

type JpegMeta = {
  width: number;
  height: number;
  orientation: number;
};

type DecodedImage = {
  source: CanvasImageSource;
  width: number;
  height: number;
  close: () => void;
};

function readExifOrientation(
  view: DataView,
  start: number,
  length: number,
): number | null {
  if (length < 16) return null;
  if (
    view.getUint8(start) !== 0x45 ||
    view.getUint8(start + 1) !== 0x78 ||
    view.getUint8(start + 2) !== 0x69 ||
    view.getUint8(start + 3) !== 0x66 ||
    view.getUint16(start + 4) !== 0
  ) {
    return null;
  }

  const tiff = start + 6;
  const endian = view.getUint16(tiff);
  const little = endian === 0x4949;
  if (!little && endian !== 0x4d4d) return null;

  const u16 = (offset: number) => view.getUint16(offset, little);
  const u32 = (offset: number) => view.getUint32(offset, little);

  if (u16(tiff + 2) !== 0x002a) return null;
  const ifd0 = tiff + u32(tiff + 4);
  if (ifd0 < tiff || ifd0 + 2 > view.byteLength) return null;

  const count = u16(ifd0);
  for (let i = 0; i < count; i++) {
    const entry = ifd0 + 2 + i * 12;
    if (entry + 12 > view.byteLength) break;
    if (u16(entry) === 0x0112) {
      const value = u16(entry + 8);
      if (value >= 1 && value <= 8) return value;
    }
  }
  return 1;
}

function readJpegMeta(buffer: ArrayBuffer): JpegMeta | null {
  const view = new DataView(buffer);
  if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return null;

  let offset = 2;
  let orientation = 1;
  let width = 0;
  let height = 0;

  while (offset + 4 <= view.byteLength) {
    if (view.getUint8(offset) !== 0xff) break;
    const marker = view.getUint8(offset + 1);

    if (marker === 0xda || marker === 0xd9) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }

    const size = view.getUint16(offset + 2);
    if (size < 2 || offset + 2 + size > view.byteLength) break;

    if (marker === 0xe1) {
      const parsed = readExifOrientation(view, offset + 4, size - 2);
      if (parsed != null) orientation = parsed;
    }

    if (
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf)
    ) {
      if (offset + 9 <= view.byteLength) {
        height = view.getUint16(offset + 5);
        width = view.getUint16(offset + 7);
      }
    }

    offset += 2 + size;
  }

  if (!width || !height) return null;
  return { width, height, orientation };
}

function orientedSize(width: number, height: number, orientation: number) {
  return orientation >= 5 && orientation <= 8
    ? { width: height, height: width }
    : { width, height };
}

function sameSize(
  width: number,
  height: number,
  other: { width: number; height: number },
) {
  return width === other.width && height === other.height;
}

async function decodeBitmap(
  file: Blob,
  options?: ImageBitmapOptions,
): Promise<DecodedImage> {
  const bitmap = options
    ? await createImageBitmap(file, options)
    : await createImageBitmap(file);
  return {
    source: bitmap,
    width: bitmap.width,
    height: bitmap.height,
    close: () => bitmap.close(),
  };
}

async function decodeHtmlImage(file: Blob): Promise<DecodedImage> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return {
      source: img,
      width: img.naturalWidth,
      height: img.naturalHeight,
      close: () => URL.revokeObjectURL(url),
    };
  } catch (err) {
    URL.revokeObjectURL(url);
    throw err;
  }
}

function orientationToApply(
  decoded: DecodedImage,
  meta: JpegMeta | null,
  decoderAppliesExif: boolean,
): number {
  if (!meta || meta.orientation <= 1 || decoderAppliesExif) return 1;

  const expected = orientedSize(meta.width, meta.height, meta.orientation);
  const matchesRaw = sameSize(decoded.width, decoded.height, meta);
  const matchesOriented = sameSize(decoded.width, decoded.height, expected);

  // Only bake EXIF when the decoder still has stored (unrotated) pixels.
  // If width/height already match the oriented size, applying again rotates 90°.
  if (meta.orientation >= 5 && matchesRaw && !matchesOriented) {
    return meta.orientation;
  }
  if (meta.orientation >= 2 && meta.orientation <= 4 && matchesRaw) {
    return meta.orientation;
  }
  return 1;
}

async function decodeImage(
  file: Blob,
  meta: JpegMeta | null,
): Promise<{ decoded: DecodedImage; orientation: number }> {
  // Prefer raw pixels, then bake EXIF ourselves. `from-image` first can rotate
  // landscape phone photos 90° on iOS when the bitmap size is not swapped.
  const attempts: Array<{
    decode: () => Promise<DecodedImage>;
    decoderAppliesExif: boolean;
  }> = [
    {
      decode: () => decodeBitmap(file, { imageOrientation: "none" }),
      decoderAppliesExif: false,
    },
    {
      decode: () => decodeHtmlImage(file),
      decoderAppliesExif: true,
    },
    {
      decode: () => decodeBitmap(file),
      decoderAppliesExif: true,
    },
  ];

  let lastError: unknown;

  for (const attempt of attempts) {
    try {
      const decoded = await attempt.decode();
      return {
        decoded,
        orientation: orientationToApply(
          decoded,
          meta,
          attempt.decoderAppliesExif,
        ),
      };
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Could not read that photo. Try a JPEG or PNG.");
}

function drawNormalized(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  srcW: number,
  srcH: number,
  orientation: number,
) {
  const outW = orientation >= 5 && orientation <= 8 ? srcH : srcW;
  const outH = orientation >= 5 && orientation <= 8 ? srcW : srcH;
  const scale = Math.min(1, MAX_EDGE / Math.max(outW, outH));
  const w = Math.max(1, Math.round(srcW * scale));
  const h = Math.max(1, Math.round(srcH * scale));

  const canvas = ctx.canvas;
  canvas.width = orientation >= 5 && orientation <= 8 ? h : w;
  canvas.height = orientation >= 5 && orientation <= 8 ? w : h;

  switch (orientation) {
    case 2:
      ctx.transform(-1, 0, 0, 1, w, 0);
      break;
    case 3:
      ctx.transform(-1, 0, 0, -1, w, h);
      break;
    case 4:
      ctx.transform(1, 0, 0, -1, 0, h);
      break;
    case 5:
      ctx.transform(0, 1, 1, 0, 0, 0);
      break;
    case 6:
      ctx.transform(0, 1, -1, 0, h, 0);
      break;
    case 7:
      ctx.transform(0, -1, -1, 0, h, w);
      break;
    case 8:
      ctx.transform(0, -1, 1, 0, 0, w);
      break;
    default:
      break;
  }

  ctx.drawImage(source, 0, 0, w, h);
}

export async function canvasToJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  const out = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
  );
  if (!out) throw new Error("Could not compress photo");
  return out;
}

export async function loadOrientedImage(file: File): Promise<HTMLCanvasElement> {
  const meta = readJpegMeta(await file.arrayBuffer());
  const { decoded, orientation } = await decodeImage(file, meta);

  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not compress photo");
    drawNormalized(
      ctx,
      decoded.source,
      decoded.width,
      decoded.height,
      orientation,
    );
    return canvas;
  } finally {
    decoded.close();
  }
}

export async function loadImageFromUrl(url: string): Promise<HTMLCanvasElement> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Could not open photo");
  const blob = await res.blob();
  const type = blob.type.startsWith("image/") ? blob.type : "image/jpeg";
  return loadOrientedImage(new File([blob], "photo.jpg", { type }));
}

export async function cropToJpeg(
  source: HTMLCanvasElement,
  crop: { x: number; y: number; width: number; height: number },
): Promise<Blob> {
  const sx = Math.min(source.width - 1, Math.max(0, crop.x));
  const sy = Math.min(source.height - 1, Math.max(0, crop.y));
  const sw = Math.min(source.width - sx, Math.max(1, crop.width));
  const sh = Math.min(source.height - sy, Math.max(1, crop.height));

  const scale = Math.min(1, MAX_EDGE / Math.max(sw, sh));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sw * scale));
  canvas.height = Math.max(1, Math.round(sh * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not compress photo");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  return canvasToJpeg(canvas);
}

export async function compressImage(file: File): Promise<Blob> {
  return canvasToJpeg(await loadOrientedImage(file));
}

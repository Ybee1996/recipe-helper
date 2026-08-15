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

async function decodeImage(
  file: Blob,
  meta: JpegMeta | null,
): Promise<{ decoded: DecodedImage; orientation: number }> {
  const expected = meta
    ? orientedSize(meta.width, meta.height, meta.orientation)
    : null;

  const attempts: Array<() => Promise<DecodedImage>> = [
    () => decodeBitmap(file, { imageOrientation: "from-image" }),
    () => decodeBitmap(file, { imageOrientation: "none" }),
    () => decodeBitmap(file),
    () => decodeHtmlImage(file),
  ];

  let fallback: DecodedImage | null = null;

  for (const attempt of attempts) {
    try {
      const decoded = await attempt();
      if (!meta || !expected) {
        return { decoded, orientation: 1 };
      }

      const matchesRaw = sameSize(decoded.width, decoded.height, meta);
      const matchesOriented = sameSize(decoded.width, decoded.height, expected);

      if (matchesOriented && !matchesRaw) {
        return { decoded, orientation: 1 };
      }
      if (matchesRaw) {
        return { decoded, orientation: meta.orientation };
      }
      if (matchesOriented) {
        return { decoded, orientation: 1 };
      }

      if (!fallback) fallback = decoded;
      else decoded.close();
    } catch {
      // try the next decoder; browsers disagree on ImageBitmap orientation
    }
  }

  if (fallback) return { decoded: fallback, orientation: 1 };
  throw new Error("Could not read that photo. Try a JPEG or PNG.");
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

export async function compressImage(file: File): Promise<Blob> {
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

    const out = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
    );
    if (!out) throw new Error("Could not compress photo");
    return out;
  } finally {
    decoded.close();
  }
}

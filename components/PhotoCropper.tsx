"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cropToJpeg } from "@/lib/compress-image";

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

type Layout = {
  cropX: number;
  cropY: number;
  cropW: number;
  cropH: number;
};

type Point = { x: number; y: number };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function coverScale(layout: Layout, imgW: number, imgH: number) {
  return Math.max(layout.cropW / imgW, layout.cropH / imgH);
}

function clampOrigin(
  origin: Point,
  scale: number,
  layout: Layout,
  imgW: number,
  imgH: number,
): Point {
  const dw = imgW * scale;
  const dh = imgH * scale;
  return {
    x: clamp(origin.x, layout.cropX + layout.cropW - dw, layout.cropX),
    y: clamp(origin.y, layout.cropY + layout.cropH - dh, layout.cropY),
  };
}

function coverOrigin(
  layout: Layout,
  imgW: number,
  imgH: number,
  scale: number,
): Point {
  return {
    x: layout.cropX + (layout.cropW - imgW * scale) / 2,
    y: layout.cropY + (layout.cropH - imgH * scale) / 2,
  };
}

export function PhotoCropper({
  source,
  previewUrl,
  busy = false,
  onCancel,
  onConfirm,
  onError,
}: {
  source: HTMLCanvasElement;
  previewUrl: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: (blob: Blob) => Promise<void>;
  onError: (message: string) => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const cropRef = useRef<HTMLDivElement>(null);
  const ready = useRef(false);
  const pointers = useRef(new Map<number, Point>());
  const drag = useRef<{ origin: Point; start: Point } | null>(null);
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);

  const imgW = source.width;
  const imgH = source.height;

  const [layout, setLayout] = useState<Layout | null>(null);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [origin, setOrigin] = useState<Point>({ x: 0, y: 0 });
  const [cropping, setCropping] = useState(false);
  const [cropError, setCropError] = useState<string | null>(null);

  const layoutRef = useRef(layout);
  const zoomRef = useRef(zoom);
  const originRef = useRef(origin);
  layoutRef.current = layout;
  zoomRef.current = zoom;
  originRef.current = origin;

  const disabled = busy || cropping;
  const scale = layout ? coverScale(layout, imgW, imgH) * zoom : 1;

  function applyZoom(nextZoom: number, center: Point) {
    const box = layoutRef.current;
    if (!box) return;
    const z = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
    const prevScale = coverScale(box, imgW, imgH) * zoomRef.current;
    const nextScale = coverScale(box, imgW, imgH) * z;
    const nextOrigin = clampOrigin(
      {
        x: center.x - ((center.x - originRef.current.x) / prevScale) * nextScale,
        y: center.y - ((center.y - originRef.current.y) / prevScale) * nextScale,
      },
      nextScale,
      box,
      imgW,
      imgH,
    );
    zoomRef.current = z;
    originRef.current = nextOrigin;
    setZoom(z);
    setOrigin(nextOrigin);
  }

  useLayoutEffect(() => {
    const stage = stageRef.current;
    const crop = cropRef.current;
    if (!stage || !crop) return;

    function measure() {
      const stageEl = stageRef.current;
      const cropEl = cropRef.current;
      if (!stageEl || !cropEl) return;
      const sr = stageEl.getBoundingClientRect();
      const cr = cropEl.getBoundingClientRect();
      if (cr.width < 8 || cr.height < 8) return;
      const next: Layout = {
        cropX: cr.left - sr.left,
        cropY: cr.top - sr.top,
        cropW: cr.width,
        cropH: cr.height,
      };
      const nextScale = coverScale(next, imgW, imgH) * zoomRef.current;
      const nextOrigin = ready.current
        ? clampOrigin(originRef.current, nextScale, next, imgW, imgH)
        : coverOrigin(next, imgW, imgH, nextScale);
      ready.current = true;
      layoutRef.current = next;
      originRef.current = nextOrigin;
      setLayout(next);
      setOrigin(nextOrigin);
    }

    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(stage);
    ro.observe(crop);
    return () => ro.disconnect();
  }, [imgW, imgH]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !disabled) onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [disabled, onCancel]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    function onWheel(e: WheelEvent) {
      if (disabled) return;
      e.preventDefault();
      const rect = stageRef.current?.getBoundingClientRect();
      if (!rect) return;
      applyZoom(zoomRef.current * (e.deltaY > 0 ? 0.92 : 1.08), {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, [disabled, imgW, imgH]);

  function stagePoint(e: { clientX: number; clientY: number }): Point {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return { x: e.clientX, y: e.clientY };
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function onPointerDown(e: React.PointerEvent) {
    if (disabled) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, stagePoint(e));
    if (pointers.current.size === 1) {
      drag.current = { origin: { ...originRef.current }, start: stagePoint(e) };
      pinch.current = null;
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = {
        dist: Math.hypot(b.x - a.x, b.y - a.y) || 1,
        zoom: zoomRef.current,
      };
      drag.current = null;
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!pointers.current.has(e.pointerId)) return;
    const box = layoutRef.current;
    if (!box) return;
    pointers.current.set(e.pointerId, stagePoint(e));
    if (pointers.current.size >= 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      applyZoom(pinch.current.zoom * (dist / pinch.current.dist), {
        x: (a.x + b.x) / 2,
        y: (a.y + b.y) / 2,
      });
      return;
    }
    if (drag.current) {
      const point = stagePoint(e);
      const next = clampOrigin(
        {
          x: drag.current.origin.x + (point.x - drag.current.start.x),
          y: drag.current.origin.y + (point.y - drag.current.start.y),
        },
        coverScale(box, imgW, imgH) * zoomRef.current,
        box,
        imgW,
        imgH,
      );
      originRef.current = next;
      setOrigin(next);
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) {
      drag.current = null;
      pinch.current = null;
    } else if (pointers.current.size === 1) {
      const [left] = [...pointers.current.values()];
      drag.current = { origin: { ...originRef.current }, start: left };
      pinch.current = null;
    }
  }

  async function confirm() {
    const box = layoutRef.current;
    if (!box || disabled) return;
    setCropping(true);
    setCropError(null);
    try {
      const currentScale = coverScale(box, imgW, imgH) * zoomRef.current;
      const blob = await cropToJpeg(source, {
        x: (box.cropX - originRef.current.x) / currentScale,
        y: (box.cropY - originRef.current.y) / currentScale,
        width: box.cropW / currentScale,
        height: box.cropH / currentScale,
      });
      await onConfirm(blob);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not crop photo";
      setCropError(message);
      onError(message);
    } finally {
      setCropping(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col overscroll-none bg-[var(--paper)]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="crop-photo-title"
    >
      <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <h2
          id="crop-photo-title"
          className="text-lg font-semibold"
          style={{ fontFamily: "var(--font-display), Georgia, serif" }}
        >
          Crop photo
        </h2>
        <button
          type="button"
          disabled={disabled}
          onClick={onCancel}
          className="rounded-xl px-3 py-2 text-sm font-semibold text-[var(--muted)] disabled:opacity-50"
        >
          Cancel
        </button>
      </div>

      <div
        ref={stageRef}
        className="relative min-h-0 flex-1 touch-none overflow-hidden bg-[var(--ink)] select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={previewUrl}
          alt=""
          draggable={false}
          className="absolute left-0 top-0 max-w-none origin-top-left [image-orientation:none] will-change-transform"
          style={{
            width: imgW,
            height: imgH,
            transform: `translate(${origin.x}px, ${origin.y}px) scale(${scale})`,
          }}
        />
        <div
          ref={cropRef}
          className="pointer-events-none absolute left-1/2 top-1/2 w-[min(100%-2rem,44rem)] -translate-x-1/2 -translate-y-1/2 aspect-[16/9] rounded-2xl border-2 border-white shadow-[0_0_0_9999px_rgba(28,23,20,0.62)]"
        />
      </div>

      <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          Zoom
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            disabled={disabled || !layout}
            onChange={(e) => {
              const box = layoutRef.current;
              if (!box) return;
              applyZoom(Number(e.target.value), {
                x: box.cropX + box.cropW / 2,
                y: box.cropY + box.cropH / 2,
              });
            }}
            className="mt-2 block w-full accent-[var(--accent)]"
          />
        </label>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Drag to move. Pinch or use the slider to zoom.
        </p>
        {cropError ? (
          <p className="mt-2 text-sm font-semibold text-[var(--accent)]">
            {cropError}
          </p>
        ) : null}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            disabled={disabled || !layout}
            onClick={() => void confirm()}
            className="rounded-xl bg-[var(--accent)] px-3.5 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {disabled ? "Saving…" : "Use photo"}
          </button>
        </div>
      </div>
    </div>
  );
}

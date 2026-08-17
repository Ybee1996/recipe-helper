"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { saveOverlay } from "@/lib/save-overlay";

const HOLD_MS = 500;
const MOVE_CANCEL_PX = 12;

export function StarIcon({
  filled,
  size = 16,
}: {
  filled: boolean;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3.2 14.9 9l6.4.9-4.6 4.5 1.1 6.4L12 17.8 6.2 20.8l1.1-6.4L2.7 9.9 9.1 9 12 3.2Z" />
    </svg>
  );
}

function vibratePulse() {
  try {
    navigator.vibrate?.(20);
  } catch {
    // Vibration is best-effort; iOS Safari does not support it.
  }
}

export function useHoldReveal() {
  const holdTimer = useRef<number | null>(null);
  const didHold = useRef(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    return () => {
      if (holdTimer.current != null) window.clearTimeout(holdTimer.current);
    };
  }, []);

  function clearHold() {
    if (holdTimer.current != null) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  }

  const dismiss = useCallback(() => {
    didHold.current = false;
    start.current = null;
    setRevealed(false);
  }, []);

  function onPointerDown(e: React.PointerEvent) {
    if (e.pointerType !== "touch") return;
    didHold.current = false;
    start.current = { x: e.clientX, y: e.clientY };
    clearHold();
    holdTimer.current = window.setTimeout(() => {
      didHold.current = true;
      setRevealed(true);
      vibratePulse();
    }, HOLD_MS);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!start.current || holdTimer.current == null) return;
    const dx = e.clientX - start.current.x;
    const dy = e.clientY - start.current.y;
    if (dx * dx + dy * dy > MOVE_CANCEL_PX * MOVE_CANCEL_PX) {
      clearHold();
      start.current = null;
    }
  }

  function onPointerEnd() {
    clearHold();
    start.current = null;
  }

  function onClickCapture(e: React.MouseEvent) {
    if (!didHold.current) return;
    e.preventDefault();
    e.stopPropagation();
    didHold.current = false;
  }

  return {
    revealed,
    dismiss,
    holdHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: onPointerEnd,
      onPointerCancel: onPointerEnd,
      onClickCapture,
      onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    },
  };
}

export function FavouriteButton({
  recipeId,
  recipeTitle,
  favourited,
  onChange,
  className,
  iconSize = 16,
}: {
  recipeId: string;
  recipeTitle: string;
  favourited: boolean;
  onChange?: (favourited: boolean) => void;
  className?: string;
  iconSize?: number;
}) {
  const [on, setOn] = useState(favourited);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setOn(favourited);
  }, [favourited]);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    const next = !on;
    setOn(next);
    onChange?.(next);
    setBusy(true);
    try {
      await saveOverlay(recipeId, { favourite: next });
    } catch {
      setOn(!next);
      onChange?.(!next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={toggle}
      aria-pressed={on}
      aria-label={
        on
          ? `Remove ${recipeTitle} from favourites`
          : `Add ${recipeTitle} to favourites`
      }
      title={on ? "Remove from favourites" : "Add to favourites"}
      className={`${className ?? ""} ${on ? "!text-[var(--accent)]" : ""}`.trim()}
    >
      <StarIcon filled={on} size={iconSize} />
    </button>
  );
}

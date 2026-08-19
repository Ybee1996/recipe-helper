"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";

export const SHEET_DISMISS_PX = 72;
const DRAG_START_PX = 8;
const DISMISS_VELOCITY = 0.5;

type DragState = {
  pointerId: number;
  startY: number;
  startT: number;
  moved: boolean;
  captured: boolean;
  fromList: boolean;
};

function isDesktop() {
  return window.matchMedia("(min-width: 1024px)").matches;
}

function clientYFromTouch(e: TouchEvent): number | undefined {
  const touch = e.changedTouches[0] ?? e.touches[0];
  return touch?.clientY;
}

/**
 * Phone-sheet swipe-to-dismiss. Native non-passive touchmove + handle
 * touch-action:none keep Android Chrome from stealing the vertical pan.
 */
export function useSheetDismiss<T extends HTMLElement>(
  dialogRef: RefObject<T | null>,
  active: boolean,
  onDismiss: () => void,
) {
  const [dragY, setDragY] = useState(0);
  const drag = useRef<DragState | null>(null);
  const dragYRef = useRef(0);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (active) return;
    drag.current = null;
    dragYRef.current = 0;
    setDragY(0);
  }, [active]);

  const finishDrag = useCallback((clientY: number | undefined) => {
    const state = drag.current;
    if (!state) return;
    const dy =
      clientY != null ? Math.max(0, clientY - state.startY) : dragYRef.current;
    const elapsed = Math.max(16, Date.now() - state.startT);
    const vy = dy / elapsed;
    const moved = state.moved;
    drag.current = null;
    dragYRef.current = 0;
    setDragY(0);
    if (!moved) return;
    if (dy > SHEET_DISMISS_PX || vy > DISMISS_VELOCITY) onDismissRef.current();
  }, []);

  useEffect(() => {
    if (!active) return;
    const el = dialogRef.current;
    if (!el) return;

    const applyTouchDy = (clientY: number, evt: TouchEvent) => {
      const state = drag.current;
      if (!state) return;
      const dy = clientY - state.startY;

      if (dy < 0 && state.fromList && !state.moved) {
        drag.current = null;
        return;
      }

      if ((state.captured || dy > 0) && evt.cancelable) evt.preventDefault();

      if (!state.moved) {
        if (Math.abs(dy) < DRAG_START_PX) return;
        state.captured = true;
        state.moved = true;
      }

      dragYRef.current = Math.max(0, dy);
      setDragY(dragYRef.current);
    };

    const onTouchMove = (e: TouchEvent) => {
      const state = drag.current;
      if (!state) return;
      const touch = e.touches[0];
      if (!touch) return;
      applyTouchDy(touch.clientY, e);
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!drag.current) return;
      finishDrag(clientYFromTouch(e));
    };

    const onTouchCancel = () => {
      if (!drag.current) return;
      finishDrag(undefined);
    };

    el.addEventListener("touchmove", onTouchMove, { passive: false, capture: true });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchCancel);
    return () => {
      el.removeEventListener("touchmove", onTouchMove, { capture: true });
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchCancel);
    };
  }, [active, dialogRef, finishDrag]);

  function onPointerDown(e: ReactPointerEvent<T>) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (isDesktop()) return;
    const target = e.target as HTMLElement;
    if (target.closest("input, textarea, select")) return;

    const fromHandle = !!target.closest("[data-sheet-handle]");
    const fromChrome = !!target.closest("[data-sheet-chrome]");
    if (target.closest("a, button") && !fromHandle) return;

    const scroller = dialogRef.current?.querySelector<HTMLElement>(
      "[data-sheet-scroll]",
    );
    const atTop = !scroller || scroller.scrollTop <= 1;
    if (!fromHandle && !fromChrome && !atTop) return;

    drag.current = {
      pointerId: e.pointerId,
      startY: e.clientY,
      startT: Date.now(),
      moved: false,
      captured: fromHandle,
      fromList: !fromHandle && !fromChrome,
    };
  }

  function onPointerMove(e: ReactPointerEvent<T>) {
    const state = drag.current;
    if (!state || e.pointerId !== state.pointerId) return;
    const dy = e.clientY - state.startY;
    if (!state.moved) {
      if (Math.abs(dy) < DRAG_START_PX) return;
      if (dy < 0 && state.fromList) {
        drag.current = null;
        return;
      }
      state.captured = true;
      state.moved = true;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Android may have already cancelled the pointer.
      }
    }
    dragYRef.current = Math.max(0, dy);
    setDragY(dragYRef.current);
  }

  function onPointerUp(e: ReactPointerEvent<T>) {
    const state = drag.current;
    if (!state || e.pointerId !== state.pointerId) return;
    finishDrag(e.clientY);
  }

  function onPointerCancel(e: ReactPointerEvent<T>) {
    const state = drag.current;
    if (!state || e.pointerId !== state.pointerId) return;
    const dy = dragYRef.current;
    const elapsed = Math.max(16, Date.now() - state.startT);
    const vy = dy / elapsed;
    if (state.moved && (dy > SHEET_DISMISS_PX || vy > DISMISS_VELOCITY)) {
      finishDrag(undefined);
      return;
    }
    drag.current = null;
    dragYRef.current = 0;
    setDragY(0);
  }

  return {
    dragY,
    dragging: dragY > 0,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
  };
}

"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  formatTimerRemaining,
  useRecipeTimers,
  type RecipeTimer,
} from "@/components/RecipeTimersProvider";

export function TimerIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 18 18"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6.5 2.75h5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="9" cy="10.25" r="5.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M9 10.25V7.4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M13.85 4.7 15 3.55"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function TimerIconButton({
  className = "",
}: {
  className?: string;
}) {
  const { openSetup, timers } = useRecipeTimers();
  const live = timers.filter((t) => !t.ended).length;
  return (
    <button
      type="button"
      onClick={openSetup}
      aria-label={live ? `Add timer, ${live} running` : "Add timer"}
      title="Timer"
      className={
        className ||
        "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--chip)] hover:text-[var(--accent)]"
      }
    >
      <TimerIcon />
    </button>
  );
}

const TIMER_COLORS = [
  "var(--accent)",
  "var(--plan)",
  "var(--sage)",
  "var(--danger)",
] as const;

function colorForTimer(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash + id.charCodeAt(i) * (i + 1)) % TIMER_COLORS.length;
  }
  return TIMER_COLORS[hash] ?? TIMER_COLORS[0];
}

function TimerChip({ timer }: { timer: RecipeTimer }) {
  const { remainingOf, deleteTimer } = useRecipeTimers();
  const remaining = remainingOf(timer);
  const label = timer.ended ? "00:00" : formatTimerRemaining(remaining);
  const color = colorForTimer(timer.id);
  const progress =
    timer.ended || timer.durationMs <= 0
      ? 0
      : Math.max(0, Math.min(1, remaining / timer.durationMs));
  const size = 92;
  const stroke = 2.75;
  const radius = size / 2 - stroke - 1;
  const circ = 2 * Math.PI * radius;

  return (
    <button
      type="button"
      onClick={() => deleteTimer(timer.id)}
      aria-label={
        timer.ended
          ? `${timer.name} finished, dismiss`
          : `Cancel ${timer.name} timer, ${label} left`
      }
      title="Tap to cancel"
      className={`relative h-[92px] w-[92px] shrink-0 rounded-full ${
        timer.ended ? "timer-ended-pulse" : ""
      }`}
      style={{ color }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0"
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="var(--card)"
          stroke="var(--line)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - progress)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className={timer.running && !timer.ended ? "" : "opacity-70"}
        />
      </svg>
      <span className="absolute inset-[11px] flex flex-col items-center justify-center px-1.5 text-center">
        <span
          className="text-[1.05rem] font-semibold leading-none tabular-nums tracking-tight"
          style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}
        >
          {label}
        </span>
        <span className="mt-1.5 h-px w-8 bg-current opacity-55" aria-hidden="true" />
        <span className="mt-1 max-w-full truncate text-[0.62rem] font-semibold leading-tight tracking-wide">
          {timer.name}
        </span>
      </span>
      <span
        className="absolute right-0 top-0 grid h-7 w-7 place-items-center rounded-full border-[1.5px] bg-[var(--paper)]"
        style={{ borderColor: color }}
        aria-hidden="true"
      >
        <TimerIcon size={13} />
      </span>
    </button>
  );
}

function TimerChips({ className = "" }: { className?: string }) {
  const { timers } = useRecipeTimers();
  if (!timers.length) return null;

  return (
    <div
      className={`flex gap-3 overflow-x-auto no-scrollbar py-1 ${className}`}
      aria-label="Timers"
    >
      {timers.map((timer) => (
        <TimerChip key={timer.id} timer={timer} />
      ))}
    </div>
  );
}

export function TimerChipStrip({ className = "" }: { className?: string }) {
  const { registerChipHost } = useRecipeTimers();
  useEffect(() => registerChipHost(), [registerChipHost]);
  return <TimerChips className={className} />;
}

function defaultTimerName(existing: string[]): string {
  const names = new Set(existing.map((name) => name.trim().toLowerCase()));
  if (!names.has("timer")) return "Timer";
  let n = 2;
  while (names.has(`timer ${n}`)) n += 1;
  return `Timer ${n}`;
}

function TimerSetupDialog() {
  const { setupOpen, closeSetup, addTimer, timers } = useRecipeTimers();
  const titleId = useId();
  const nameId = useId();
  const minId = useId();
  const secId = useId();
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState("");
  const [minutes, setMinutes] = useState("10");
  const [seconds, setSeconds] = useState("");
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const closeSetupRef = useRef(closeSetup);
  closeSetupRef.current = closeSetup;
  const scrollYRef = useRef(0);
  const pinTopRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!setupOpen) return;
    setName("");
    setMinutes("10");
    setSeconds("");
    setError(null);

    const html = document.documentElement;
    const body = document.body;
    scrollYRef.current = window.scrollY;
    const prevHtmlOverflow = html.style.overflow;
    const prevHtmlOverscroll = html.style.overscrollBehavior;
    const prevBody = body.style.cssText;
    html.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollYRef.current}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";

    const focusTimer = window.setTimeout(() => {
      nameRef.current?.focus({ preventScroll: true });
    }, 50);
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeSetupRef.current();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => {
      html.style.overflow = prevHtmlOverflow;
      html.style.overscrollBehavior = prevHtmlOverscroll;
      body.style.cssText = prevBody;
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKey);
      const top = pinTopRef.current;
      pinTopRef.current = false;
      const y = top ? 0 : scrollYRef.current;
      const restore = () => window.scrollTo(0, y);
      restore();
      requestAnimationFrame(restore);
      if (top) {
        window.setTimeout(restore, 80);
        window.setTimeout(restore, 320);
      }
    };
  }, [setupOpen]);

  if (!mounted || !setupOpen) return null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const mins = Math.max(0, Number.parseInt(minutes, 10) || 0);
    const secs = Math.min(59, Math.max(0, Number.parseInt(seconds, 10) || 0));
    const durationMs = (mins * 60 + secs) * 1000;
    if (durationMs <= 0) {
      setError("Set a time greater than zero");
      return;
    }
    const label = name.trim() || defaultTimerName(timers.map((t) => t.name));
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    pinTopRef.current = true;
    addTimer(label, durationMs);
    closeSetup();
  }

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close timer setup"
        className="absolute inset-0 bg-[var(--ink)]/40"
        onClick={closeSetup}
      />
      <form
        onSubmit={submit}
        aria-labelledby={titleId}
        className="relative w-full max-w-sm rounded-t-3xl border border-[var(--line)] bg-[var(--card)] px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 shadow-lg sm:rounded-3xl sm:p-6"
      >
        <h2
          id={titleId}
          className="text-lg font-semibold"
          style={{ fontFamily: "var(--font-display), Georgia, serif" }}
        >
          Timer
        </h2>
        <label htmlFor={nameId} className="mt-4 block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
          Name
        </label>
        <input
          ref={nameRef}
          id={nameId}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={defaultTimerName(timers.map((t) => t.name))}
          className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        />
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label htmlFor={minId} className="block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
              Minutes
            </label>
            <input
              id={minId}
              type="number"
              min={0}
              inputMode="numeric"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            />
          </div>
          <div>
            <label htmlFor={secId} className="block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
              Seconds
            </label>
            <input
              id={secId}
              type="number"
              min={0}
              max={59}
              inputMode="numeric"
              value={seconds}
              onChange={(e) => setSeconds(e.target.value)}
              placeholder="0"
              className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            />
          </div>
        </div>
        {error ? <p className="mt-3 text-sm text-[var(--accent)]">{error}</p> : null}
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={closeSetup}
            className="min-h-11 flex-1 rounded-full bg-[var(--chip)] px-4 text-sm font-semibold"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="min-h-11 flex-1 rounded-full bg-[var(--accent)] px-4 text-sm font-semibold text-white"
          >
            Start
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}

function TimerFloatingStrip() {
  const { timers, chipHosts } = useRecipeTimers();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || chipHosts > 0 || !timers.length) return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 bottom-[4.75rem] z-40 flex justify-center px-3 lg:bottom-6">
      <div className="pointer-events-auto max-w-full rounded-2xl bg-[var(--paper)]/95 p-1 shadow-md ring-1 ring-[var(--line)] backdrop-blur-md">
        <TimerChips />
      </div>
    </div>,
    document.body,
  );
}

export function RecipeTimersLayer() {
  return (
    <>
      <TimerSetupDialog />
      <TimerFloatingStrip />
    </>
  );
}

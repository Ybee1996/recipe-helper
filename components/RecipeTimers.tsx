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

function TimerChip({
  timer,
  menuPlacement = "bottom",
}: {
  timer: RecipeTimer;
  menuPlacement?: "top" | "bottom";
}) {
  const { remainingOf, pauseTimer, resumeTimer, resetTimer, deleteTimer } =
    useRecipeTimers();
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const remaining = remainingOf(timer);
  const label = timer.ended ? "Done" : formatTimerRemaining(remaining);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  function onChipClick() {
    if (timer.ended) {
      deleteTimer(timer.id);
      return;
    }
    setMenuOpen((open) => !open);
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={onChipClick}
        aria-expanded={menuOpen}
        aria-label={
          timer.ended
            ? `${timer.name} finished, dismiss`
            : `${timer.name} ${label}${timer.running ? "" : ", paused"}`
        }
        className={`inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-xs font-semibold tracking-wide ${
          timer.ended
            ? "timer-ended-pulse bg-[var(--accent)] text-white"
            : timer.running
              ? "border border-[var(--line)] bg-[var(--card)] text-[var(--ink)]"
              : "border border-dashed border-[var(--ink-faint)] bg-[var(--chip)] text-[var(--muted)]"
        }`}
      >
        <span className="max-w-[7rem] truncate">{timer.name}</span>
        <span className="tabular-nums">{label}</span>
      </button>
      {menuOpen && !timer.ended ? (
        <div
          role="menu"
          className={`absolute left-0 z-30 min-w-[9.5rem] overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--card)] py-1 text-sm font-semibold shadow-lg ${
            menuPlacement === "top"
              ? "bottom-[calc(100%+0.35rem)]"
              : "top-[calc(100%+0.35rem)]"
          }`}
        >
          <button
            type="button"
            role="menuitem"
            className="flex min-h-11 w-full items-center px-3 text-left hover:bg-[var(--chip)]"
            onClick={() => {
              if (timer.running) pauseTimer(timer.id);
              else resumeTimer(timer.id);
              setMenuOpen(false);
            }}
          >
            {timer.running ? "Pause" : "Resume"}
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex min-h-11 w-full items-center px-3 text-left hover:bg-[var(--chip)]"
            onClick={() => {
              resetTimer(timer.id);
              setMenuOpen(false);
            }}
          >
            Reset
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex min-h-11 w-full items-center px-3 text-left text-[var(--accent)] hover:bg-[var(--chip)]"
            onClick={() => {
              deleteTimer(timer.id);
              setMenuOpen(false);
            }}
          >
            Delete
          </button>
        </div>
      ) : null}
    </div>
  );
}

function TimerChips({
  className = "",
  menuPlacement = "bottom",
}: {
  className?: string;
  menuPlacement?: "top" | "bottom";
}) {
  const { timers } = useRecipeTimers();
  if (!timers.length) return null;

  return (
    <div
      className={`flex gap-1.5 overflow-x-auto no-scrollbar py-0.5 ${className}`}
      aria-label="Timers"
    >
      {timers.map((timer) => (
        <TimerChip key={timer.id} timer={timer} menuPlacement={menuPlacement} />
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

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!setupOpen) return;
    setName("");
    setMinutes("10");
    setSeconds("");
    setError(null);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => nameRef.current?.focus(), 50);
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeSetup();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKey);
    };
  }, [setupOpen, closeSetup]);

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
        <TimerChips menuPlacement="top" />
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

"use client";

import { useEffect, useRef, useState } from "react";
import type { ListedIngredient } from "@/components/EditableIngredients";
import { MethodIngredientText } from "@/components/MethodIngredientText";
import { TimerChipStrip, TimerIconButton } from "@/components/RecipeTimers";
import { useRecipeTimers } from "@/components/RecipeTimersProvider";
import { displayQty } from "@/lib/filters";
import type { Step } from "@/lib/types";

type CookPane = "ingredients" | "method";

function noop() {}

function useTouchSwipe(
  onSwipeLeft: () => void,
  onSwipeRight: () => void,
  enabled = true,
) {
  const start = useRef<{ x: number; y: number } | null>(null);

  return {
    onTouchStart(e: React.TouchEvent) {
      if (!enabled) return;
      const touch = e.changedTouches[0];
      start.current = { x: touch.clientX, y: touch.clientY };
    },
    onTouchEnd(e: React.TouchEvent) {
      if (!enabled || !start.current) return;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - start.current.x;
      const dy = touch.clientY - start.current.y;
      start.current = null;
      if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy)) return;
      if (dx < 0) onSwipeLeft();
      else onSwipeRight();
    },
    onTouchCancel() {
      start.current = null;
    },
  };
}

function IngredientChecklist({
  items,
  servings,
  baseServings,
  checked,
  onToggle,
}: {
  items: ListedIngredient[];
  servings: number;
  baseServings?: number;
  checked: Set<number>;
  onToggle: (index: number) => void;
}) {
  const named = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.name.trim());

  if (!named.length) {
    return <p className="text-[var(--muted)]">No ingredients listed.</p>;
  }

  return (
    <ul className="divide-y divide-[var(--line)]">
      {named.map(({ item, index }) => {
        const on = checked.has(index);
        const qty = displayQty(item, servings, baseServings);
        return (
          <li key={`${item.name}-${index}`}>
            <button
              type="button"
              onClick={() => onToggle(index)}
              aria-pressed={on}
              className={`flex min-h-11 w-full items-center gap-3 py-2.5 text-left text-base leading-snug ${
                on ? "text-[var(--muted)] line-through" : "text-[var(--ink)]"
              }`}
            >
              <span
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border ${
                  on
                    ? "border-[var(--plan)] bg-[var(--plan)] text-white"
                    : "border-[var(--ink-faint)] bg-[var(--paper)]"
                }`}
                aria-hidden="true"
              >
                {on ? (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M2.2 6.2 4.7 8.6 9.8 3.4"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : null}
              </span>
              <span>
                <span className="font-semibold">{qty}</span> {item.name}
                {item.pantry ? (
                  <span className="text-[var(--muted)]"> · pantry</span>
                ) : null}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function StepDots({
  count,
  current,
  onSelect,
}: {
  count: number;
  current: number;
  onSelect: (index: number) => void;
}) {
  if (count <= 1) return null;
  return (
    <div
      className="flex max-w-full justify-center gap-0 overflow-x-auto no-scrollbar"
      aria-hidden="true"
    >
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onSelect(i)}
          className="grid h-11 w-7 shrink-0 place-items-center"
          aria-label={`Step ${i + 1}`}
        >
          <span
            className={`block h-2 rounded-full transition-all ${
              i === current
                ? "w-5 bg-[var(--accent)]"
                : "w-2 bg-[var(--ink-faint)]"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

function MethodPane({
  step,
  stepIndex,
  lastStep,
  count,
  items,
  servings,
  baseServings,
  stepSwipe,
  onSelectStep,
  onSwipeToIngredients,
}: {
  step: Step | undefined;
  stepIndex: number;
  lastStep: number;
  count: number;
  items: ListedIngredient[];
  servings: number;
  baseServings?: number;
  stepSwipe: ReturnType<typeof useTouchSwipe>;
  onSelectStep: (index: number) => void;
  onSwipeToIngredients?: () => void;
}) {
  const chromeSwipe = useTouchSwipe(
    noop,
    () => onSwipeToIngredients?.(),
    Boolean(onSwipeToIngredients),
  );

  if (count === 0 || !step) {
    return (
      <div className="flex min-h-0 flex-1 items-center px-4">
        <p className="text-[var(--muted)]">No method steps yet.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 px-4" {...chromeSwipe}>
        <p className="text-center text-sm font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
          {stepIndex + 1} of {count}
        </p>
        <StepDots count={count} current={stepIndex} onSelect={onSelectStep} />
      </div>
      <div
        className="min-h-0 flex-1 overflow-y-auto px-4"
        onTouchStart={(e) => {
          e.stopPropagation();
          stepSwipe.onTouchStart(e);
        }}
        onTouchEnd={(e) => {
          e.stopPropagation();
          stepSwipe.onTouchEnd(e);
        }}
        onTouchCancel={() => {
          stepSwipe.onTouchCancel();
        }}
      >
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--card)] px-5 py-6">
          {step.title.trim() ? (
            <h3
              className="text-xl font-semibold leading-snug lg:text-2xl"
              style={{ fontFamily: "var(--font-display), Georgia, serif" }}
            >
              {step.title}
            </h3>
          ) : null}
          <MethodIngredientText
            text={step.text}
            ingredients={items}
            servings={servings}
            baseServings={baseServings}
            className={`text-xl leading-relaxed text-[var(--ink)] lg:text-[1.35rem] lg:leading-relaxed ${
              step.title.trim() ? "mt-3" : ""
            }`}
          />
        </div>
      </div>
      <div className="grid shrink-0 grid-cols-2 gap-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        <button
          type="button"
          disabled={stepIndex === 0}
          onClick={() => onSelectStep(Math.max(0, stepIndex - 1))}
          className="min-h-14 rounded-2xl border border-[var(--line)] bg-[var(--card)] text-base font-semibold disabled:opacity-35"
        >
          Prev
        </button>
        <button
          type="button"
          disabled={stepIndex >= lastStep}
          onClick={() => onSelectStep(Math.min(lastStep, stepIndex + 1))}
          className="min-h-14 rounded-2xl bg-[var(--accent)] text-base font-semibold text-white disabled:opacity-35"
        >
          Next
        </button>
      </div>
    </div>
  );
}

function CookingViewInner({
  title,
  servings,
  baseServings,
  items,
  steps,
  onClose,
}: {
  title: string;
  servings: number;
  baseServings?: number;
  items: ListedIngredient[];
  steps: Step[];
  onClose: () => void;
}) {
  const { setCookAwake } = useRecipeTimers();
  const [pane, setPane] = useState<CookPane>("method");
  const [stepIndex, setStepIndex] = useState(0);
  const [checked, setChecked] = useState<Set<number>>(() => new Set());
  const usableSteps = steps.filter((step) => step.title.trim() || step.text.trim());
  const lastStep = Math.max(0, usableSteps.length - 1);
  const step = usableSteps[stepIndex] ?? usableSteps[0];

  useEffect(() => {
    setCookAwake(true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      setCookAwake(false);
      document.body.style.overflow = prevOverflow;
    };
  }, [setCookAwake]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === "ArrowRight") {
        if (pane === "ingredients") setPane("method");
        else setStepIndex((i) => Math.min(lastStep, i + 1));
      }
      if (event.key === "ArrowLeft") {
        if (pane === "method" && stepIndex === 0) setPane("ingredients");
        else if (pane === "method") setStepIndex((i) => Math.max(0, i - 1));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, pane, stepIndex, lastStep]);

  const paneSwipe = useTouchSwipe(
    () => setPane("method"),
    () => setPane("ingredients"),
  );
  const stepSwipe = useTouchSwipe(
    () => setStepIndex((i) => Math.min(lastStep, i + 1)),
    () => {
      if (stepIndex <= 0) setPane("ingredients");
      else setStepIndex((i) => Math.max(0, i - 1));
    },
  );

  function toggleChecked(index: number) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col overscroll-none bg-[var(--paper)]"
      role="dialog"
      aria-modal="true"
      aria-label={`Cooking ${title}`}
    >
      <div className="flex shrink-0 items-center gap-2 px-3 pb-1 pt-[max(0.65rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-sm font-semibold text-[var(--accent)]"
        >
          Close
        </button>
        <h2
          className="min-w-0 flex-1 truncate text-center text-base font-semibold lg:text-lg"
          style={{ fontFamily: "var(--font-display), Georgia, serif" }}
        >
          {title}
        </h2>
        <TimerIconButton />
      </div>

      <div className="shrink-0 px-3 pb-1">
        <TimerChipStrip />
      </div>

      <div
        className="flex shrink-0 gap-1 px-3 lg:hidden"
        role="tablist"
        aria-label="Cook pages"
      >
        {(["ingredients", "method"] as const).map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={pane === id}
            onClick={() => setPane(id)}
            className={`min-h-11 flex-1 rounded-full text-sm font-semibold ${
              pane === id
                ? "bg-[var(--ink)] text-[var(--paper)]"
                : "bg-[var(--chip)] text-[var(--muted)]"
            }`}
          >
            {id === "ingredients" ? "Ingredients" : "Method"}
          </button>
        ))}
      </div>

      <div className="mt-2 hidden min-h-0 flex-1 lg:grid lg:grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)] lg:gap-8 lg:px-8 lg:pb-6">
        <div className="min-h-0 overflow-y-auto rounded-2xl border border-[var(--line)] bg-[var(--card)] p-5">
          <h3 className="text-lg font-semibold">Ingredients</h3>
          <p className="mt-1 text-sm font-semibold text-[var(--muted)]">
            Serves {servings}
          </p>
          <div className="mt-2">
            <IngredientChecklist
              items={items}
              servings={servings}
              baseServings={baseServings}
              checked={checked}
              onToggle={toggleChecked}
            />
          </div>
        </div>
        <MethodPane
          step={step}
          stepIndex={stepIndex}
          lastStep={lastStep}
          count={usableSteps.length}
          items={items}
          servings={servings}
          baseServings={baseServings}
          stepSwipe={stepSwipe}
          onSelectStep={setStepIndex}
        />
      </div>

      <div className="mt-2 min-h-0 flex-1 overflow-hidden lg:hidden">
        <div
          className="flex h-full transition-transform duration-200 ease-out"
          style={{ transform: `translateX(${pane === "method" ? "-100%" : "0"})` }}
        >
          <div
            className="flex h-full w-full shrink-0 flex-col overflow-y-auto px-4 pb-6"
            {...paneSwipe}
          >
            <p className="mb-2 text-sm font-semibold text-[var(--muted)]">
              Serves {servings}
            </p>
            <IngredientChecklist
              items={items}
              servings={servings}
              baseServings={baseServings}
              checked={checked}
              onToggle={toggleChecked}
            />
          </div>
          <div className="flex h-full w-full shrink-0 flex-col">
            <MethodPane
              step={step}
              stepIndex={stepIndex}
              lastStep={lastStep}
              count={usableSteps.length}
              items={items}
              servings={servings}
              baseServings={baseServings}
              stepSwipe={stepSwipe}
              onSelectStep={setStepIndex}
              onSwipeToIngredients={() => setPane("ingredients")}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function CookingView({
  open,
  title,
  servings,
  baseServings,
  items,
  steps,
  onClose,
}: {
  open: boolean;
  title: string;
  servings: number;
  baseServings?: number;
  items: ListedIngredient[];
  steps: Step[];
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <CookingViewInner
      title={title}
      servings={servings}
      baseServings={baseServings}
      items={items}
      steps={steps}
      onClose={onClose}
    />
  );
}

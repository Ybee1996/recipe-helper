"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { ListedIngredient } from "@/components/EditableIngredients";
import { MethodIngredientText } from "@/components/MethodIngredientText";
import { CookTimerDock } from "@/components/RecipeTimers";
import { useRecipeTimers } from "@/components/RecipeTimersProvider";
import { displayQty } from "@/lib/filters";
import type { Step } from "@/lib/types";

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
    <ul>
      {named.map(({ item, index }) => {
        const on = checked.has(index);
        const qty = displayQty(item, servings, baseServings);
        return (
          <li key={`${item.name}-${index}`}>
            <button
              type="button"
              onClick={() => onToggle(index)}
              aria-pressed={on}
              className={`flex min-h-12 w-full items-center gap-3.5 py-2.5 text-left text-[1.05rem] leading-snug ${
                on ? "text-[var(--muted)] line-through" : "text-[var(--ink)]"
              }`}
            >
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border ${
                  on
                    ? "border-[var(--plan)] bg-[var(--plan)] text-white"
                    : "border-[var(--ink-faint)] bg-[var(--card)]"
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
                <span className="font-semibold tabular-nums">{qty}</span> {item.name}
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

function IngredientsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M9 6.4 6.85 2.85M9 6.4 9 2.55M9 6.4 11.15 2.85"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M6.4 7.05c.7-.4 1.55-.55 2.6-.55s1.9.15 2.6.55c.15.1.2.35.1.55C11.2 9.15 10.35 12.1 9 15.2 7.65 12.1 6.8 9.15 6.3 7.6c-.1-.2-.05-.45.1-.55Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Chevron({ dir }: { dir: "prev" | "next" }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d={dir === "prev" ? "M11 4.5 6.5 9 11 13.5" : "M7 4.5 11.5 9 7 13.5"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StepRail({
  stepCount,
  slideIndex,
  onSelect,
}: {
  stepCount: number;
  slideIndex: number;
  onSelect: (index: number) => void;
}) {
  const currentRef = useRef<HTMLButtonElement>(null);
  const total = stepCount + 1;

  useEffect(() => {
    currentRef.current?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [slideIndex]);

  return (
    <div
      className="overflow-x-auto no-scrollbar"
      role="tablist"
      aria-label="Cooking pages"
    >
      <div className="mx-auto flex w-max gap-0.5 px-1">
      <button
        ref={slideIndex === 0 ? currentRef : undefined}
        type="button"
        role="tab"
        aria-selected={slideIndex === 0}
        aria-label="Ingredients"
        title="Ingredients"
        onClick={() => onSelect(0)}
        className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-semibold transition-colors ${
          slideIndex === 0
            ? "bg-[var(--ink)] text-[var(--paper)]"
            : "text-[var(--muted)]"
        }`}
      >
        <IngredientsIcon />
      </button>
      {Array.from({ length: stepCount }, (_, step) => {
        const index = step + 1;
        const current = slideIndex === index;
        return (
          <button
            key={step}
            ref={current ? currentRef : undefined}
            type="button"
            role="tab"
            aria-selected={current}
            aria-label={`Step ${step + 1} of ${stepCount}`}
            onClick={() => onSelect(index)}
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-semibold tabular-nums transition-colors ${
              current
                ? "bg-[var(--accent)] text-white"
                : "text-[var(--muted)]"
            }`}
          >
            {step + 1}
          </button>
        );
      })}
      <span className="sr-only">
        {slideIndex === 0
          ? "Ingredients"
          : `Step ${slideIndex} of ${stepCount}, page ${slideIndex + 1} of ${total}`}
      </span>
      </div>
    </div>
  );
}

function IngredientsSlide({
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
  return (
    <div className="mx-auto w-full max-w-2xl px-5 pb-8 pt-2">
      <p
        className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]"
      >
        Ingredients
      </p>
      <h3
        className="mt-1 text-2xl font-semibold tracking-tight"
        style={{ fontFamily: "var(--font-display), Georgia, serif" }}
      >
        Serves {servings}
      </h3>
      <div className="mt-4">
        <IngredientChecklist
          items={items}
          servings={servings}
          baseServings={baseServings}
          checked={checked}
          onToggle={onToggle}
        />
      </div>
    </div>
  );
}

function StepSlide({
  step,
  stepIndex,
  count,
  items,
  servings,
  baseServings,
  isLast,
  onFinish,
}: {
  step: Step;
  stepIndex: number;
  count: number;
  items: ListedIngredient[];
  servings: number;
  baseServings?: number;
  isLast: boolean;
  onFinish: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col px-5 pb-8 pt-2">
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
        Step {stepIndex + 1} of {count}
      </p>
      {step.title.trim() ? (
        <h3
          className="mt-1 text-2xl font-semibold leading-snug tracking-tight lg:text-[1.75rem]"
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
        className={`text-[1.2rem] leading-[1.7] text-[var(--ink)] lg:text-[1.35rem] lg:leading-[1.7] ${
          step.title.trim() ? "mt-4" : "mt-3"
        }`}
      />
      {isLast ? (
        <button
          type="button"
          onClick={onFinish}
          className="mt-8 min-h-12 w-full rounded-full bg-[var(--accent)] text-base font-semibold text-white"
        >
          Done cooking
        </button>
      ) : null}
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
  const usableSteps = steps.filter((step) => step.title.trim() || step.text.trim());
  const slideCount = usableSteps.length + 1;
  const startIndex = usableSteps.length ? 1 : 0;
  const [slideIndex, setSlideIndex] = useState(startIndex);
  const [checked, setChecked] = useState<Set<number>>(() => new Set());
  const scrollerRef = useRef<HTMLDivElement>(null);
  const lockRef = useRef<number | null>(null);
  const unlockTimer = useRef<number>(0);

  const goTo = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(slideCount - 1, next));
      setSlideIndex(clamped);
      const scroller = scrollerRef.current;
      const child = scroller?.children[clamped] as HTMLElement | undefined;
      if (!scroller || !child) return;
      lockRef.current = clamped;
      window.clearTimeout(unlockTimer.current);
      scroller.scrollTo({ left: child.offsetLeft, behavior: "smooth" });
      unlockTimer.current = window.setTimeout(() => {
        lockRef.current = null;
      }, 420);
    },
    [slideCount],
  );

  useEffect(() => {
    setCookAwake(true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      setCookAwake(false);
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(unlockTimer.current);
    };
  }, [setCookAwake]);

  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    const child = scroller?.children[startIndex] as HTMLElement | undefined;
    if (!scroller || !child) return;
    scroller.scrollLeft = child.offsetLeft;
  }, [startIndex]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    let frame = 0;

    function syncFromScroll() {
      const el = scrollerRef.current;
      if (!el) return;
      if (lockRef.current != null) {
        setSlideIndex(lockRef.current);
        return;
      }
      const width = el.clientWidth || 1;
      const next = Math.round(el.scrollLeft / width);
      setSlideIndex(Math.max(0, Math.min(slideCount - 1, next)));
    }

    function onScroll() {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        syncFromScroll();
      });
    }

    function onScrollEnd() {
      lockRef.current = null;
      syncFromScroll();
    }

    scroller.addEventListener("scroll", onScroll, { passive: true });
    scroller.addEventListener("scrollend", onScrollEnd);
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      scroller.removeEventListener("scrollend", onScrollEnd);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [slideCount]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        goTo(slideIndex + 1);
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goTo(slideIndex - 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, goTo, slideIndex]);

  function toggleChecked(index: number) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  const progress = slideCount > 1 ? ((slideIndex + 1) / slideCount) * 100 : 100;
  const liveLabel =
    slideIndex === 0
      ? `Ingredients, serves ${servings}`
      : `Step ${slideIndex} of ${usableSteps.length}`;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col overscroll-none bg-[var(--paper)]"
      role="dialog"
      aria-modal="true"
      aria-label={`Cooking ${title}`}
    >
      <div className="sr-only" aria-live="polite">
        {liveLabel}
      </div>

      <header className="shrink-0 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-2 px-2">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 min-w-14 items-center justify-center px-2 text-sm font-semibold text-[var(--accent)]"
          >
            Done
          </button>
          <h2
            className="min-w-0 flex-1 truncate text-center text-base font-semibold lg:text-lg"
            style={{ fontFamily: "var(--font-display), Georgia, serif" }}
          >
            {title}
          </h2>
          <span className="inline-flex h-11 min-w-14" aria-hidden="true" />
        </div>
        <div className="px-2 pb-1 pt-0.5">
          <StepRail
            stepCount={usableSteps.length}
            slideIndex={slideIndex}
            onSelect={goTo}
          />
        </div>
        <div className="h-0.5 bg-[var(--line)]" aria-hidden="true">
          <div
            className="h-full bg-[var(--accent)] transition-[width] duration-200 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1 flex-col">
        <div
          ref={scrollerRef}
          className="cook-pager h-full min-h-0 flex-1"
          aria-label="Recipe steps"
        >
          <section className="cook-slide" aria-label="Ingredients">
            <IngredientsSlide
              items={items}
              servings={servings}
              baseServings={baseServings}
              checked={checked}
              onToggle={toggleChecked}
            />
            {usableSteps.length === 0 ? (
              <p className="mx-auto max-w-2xl px-5 pb-8 text-[var(--muted)]">
                No method steps yet.
              </p>
            ) : null}
          </section>
          {usableSteps.map((step, index) => (
            <section
              key={`${step.n}-${index}`}
              className="cook-slide"
              aria-label={`Step ${index + 1} of ${usableSteps.length}`}
            >
              <StepSlide
                step={step}
                stepIndex={index}
                count={usableSteps.length}
                items={items}
                servings={servings}
                baseServings={baseServings}
                isLast={index === usableSteps.length - 1}
                onFinish={onClose}
              />
            </section>
          ))}
        </div>

        <button
          type="button"
          onClick={() => goTo(slideIndex - 1)}
          disabled={slideIndex === 0}
          aria-label="Previous page"
          className="absolute left-2 top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] shadow-sm disabled:opacity-30 lg:grid"
        >
          <Chevron dir="prev" />
        </button>
        <button
          type="button"
          onClick={() => goTo(slideIndex + 1)}
          disabled={slideIndex >= slideCount - 1}
          aria-label="Next page"
          className="absolute right-2 top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] shadow-sm disabled:opacity-30 lg:grid"
        >
          <Chevron dir="next" />
        </button>
      </div>

      <CookTimerDock />
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

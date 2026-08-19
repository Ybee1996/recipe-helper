"use client";

import { useEffect, useId, useRef, useState } from "react";
import { displayQty } from "@/lib/filters";
import { splitMethodText } from "@/lib/method-ingredients";
import type { Ingredient } from "@/lib/types";

function IngredientMention({
  text,
  ingredient,
  servings,
  baseServings,
  open,
  onToggle,
}: {
  text: string;
  ingredient: Ingredient;
  servings: number;
  baseServings?: number;
  open: boolean;
  onToggle: () => void;
}) {
  const tipId = useId();
  const qty = displayQty(ingredient, servings, baseServings);
  const label = [qty, ingredient.name].filter(Boolean).join(" ").trim();

  return (
    <span className="group relative inline">
      <button
        type="button"
        aria-describedby={open ? tipId : undefined}
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className="cursor-help text-[var(--accent)] underline decoration-dotted decoration-[var(--accent)] underline-offset-2 lg:hover:decoration-solid"
      >
        {text}
      </button>
      <span
        id={tipId}
        role="tooltip"
        className={`absolute bottom-[calc(100%+0.35rem)] left-1/2 z-20 w-max max-w-[16rem] -translate-x-1/2 rounded-lg border border-[var(--line)] bg-[var(--card)] px-2.5 py-1.5 text-left text-xs font-semibold leading-snug text-[var(--ink)] shadow-md ${
          open ? "flex" : "hidden lg:group-hover:flex"
        }`}
      >
        {label}
      </span>
    </span>
  );
}

export function MethodIngredientText({
  text,
  ingredients,
  servings,
  baseServings,
  className = "",
}: {
  text: string;
  ingredients: Ingredient[];
  servings: number;
  baseServings?: number;
  className?: string;
}) {
  const rootRef = useRef<HTMLParagraphElement>(null);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const parts = splitMethodText(text, ingredients);

  useEffect(() => {
    if (openIndex == null) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpenIndex(null);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [openIndex]);

  return (
    <p ref={rootRef} className={className}>
      {parts.map((part, index) =>
        part.type === "text" ? (
          <span key={index}>{part.value}</span>
        ) : (
          <IngredientMention
            key={index}
            text={part.value}
            ingredient={part.ingredient}
            servings={servings}
            baseServings={baseServings}
            open={openIndex === index}
            onToggle={() =>
              setOpenIndex((current) => (current === index ? null : index))
            }
          />
        ),
      )}
    </p>
  );
}

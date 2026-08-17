"use client";

import { useId, useMemo, useState } from "react";
import { AddCategoryDialog } from "@/components/AddCategoryDialog";
import { useCategories } from "@/components/CategoriesProvider";
import { applyCategoryOrder } from "@/lib/category-order";
import {
  PROTEIN_FILTERS,
  PROTEINS,
  type CustomCategory,
  type Protein,
} from "@/lib/types";

function PlusIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export const chipClass = {
  filter:
    "shrink-0 rounded-full px-3.5 py-2 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
  form: "rounded-full px-3.5 py-2 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
  edit: "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
} as const;

export function uniqueCategoryIds(ids: string[]): Protein[] {
  const seen = new Set<string>();
  const out: Protein[] = [];
  for (const id of ids) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

export function orderedCategoryIds(
  variant: keyof typeof chipClass,
  customIds: string[],
  extraIds: string[],
  order: string[],
): Protein[] {
  const builtins =
    variant === "filter" ? [...PROTEIN_FILTERS] : [...PROTEINS];
  return applyCategoryOrder(
    uniqueCategoryIds([...builtins, ...customIds, ...extraIds]),
    order,
  );
}

export function AddCategoryButton({
  onAdded,
  size = "md",
}: {
  onAdded?: (category: CustomCategory) => void;
  size?: "sm" | "md";
}) {
  const [open, setOpen] = useState(false);
  const compact = size === "sm";
  const dialogId = useId();

  return (
    <>
      <button
        type="button"
        aria-label="Add category"
        title="Add category"
        aria-haspopup="dialog"
        aria-expanded={open ? "true" : "false"}
        aria-controls={dialogId}
        onClick={() => setOpen(true)}
        className={`inline-flex shrink-0 items-center justify-center rounded-full border border-dashed border-[var(--ink-faint)] text-[var(--muted)] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent)] lg:hover:border-[var(--ink)] lg:hover:text-[var(--ink)] ${
          compact ? "h-7 w-7" : "h-[2.375rem] w-[2.375rem]"
        }`}
      >
        <PlusIcon size={compact ? 16 : 20} />
      </button>
      <AddCategoryDialog
        id={dialogId}
        open={open}
        onClose={() => setOpen(false)}
        onAdded={onAdded}
      />
    </>
  );
}

export function CategoryPicker({
  selected,
  onSelect,
  variant,
  extraIds = [],
  selectOnCreate = false,
  showAdd = true,
}: {
  selected: Protein | null;
  onSelect: (id: Protein | null) => void;
  variant: keyof typeof chipClass;
  extraIds?: string[];
  selectOnCreate?: boolean;
  showAdd?: boolean;
}) {
  const { categories, order, labelFor } = useCategories();
  const ids = useMemo(
    () =>
      orderedCategoryIds(
        variant,
        categories.map((c) => c.id),
        extraIds,
        order,
      ),
    [categories, extraIds, order, variant],
  );

  function onAdded(category: CustomCategory) {
    if (selectOnCreate) onSelect(category.id);
  }

  return (
    <>
      {ids.map((id) => {
        const on = selected === id;
        return (
          <button
            key={id}
            type="button"
            aria-pressed={on}
            onClick={() => onSelect(on && variant === "filter" ? null : id)}
            className={`${chipClass[variant]} ${
              on
                ? "bg-[var(--ink)] text-[var(--paper)]"
                : "bg-[var(--chip)] text-[var(--ink)] lg:hover:bg-[var(--line)]"
            }`}
          >
            {labelFor(id)}
          </button>
        );
      })}
      {showAdd ? (
        <AddCategoryButton
          onAdded={onAdded}
          size={variant === "edit" ? "sm" : "md"}
        />
      ) : null}
    </>
  );
}

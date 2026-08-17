"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { parseCategoryOrder } from "@/lib/category-order";
import {
  isBuiltinProtein,
  proteinLabel,
  type CustomCategory,
  type Protein,
} from "@/lib/types";

interface CategoriesContextValue {
  categories: CustomCategory[];
  order: string[];
  labelFor: (protein: Protein) => string;
  addCategory: (label: string) => Promise<CustomCategory>;
  reorder: (displayed: string[]) => void;
  deleteCategory: (id: string) => Promise<void>;
  isCustom: (id: string) => boolean;
}

const CategoriesContext = createContext<CategoriesContextValue | null>(null);

function isCustomCategory(item: unknown): item is CustomCategory {
  return (
    Boolean(item) &&
    typeof item === "object" &&
    typeof (item as CustomCategory).id === "string" &&
    typeof (item as CustomCategory).label === "string"
  );
}

export function CategoriesProvider({ children }: { children: React.ReactNode }) {
  const [categories, setCategories] = useState<CustomCategory[]>([]);
  const [order, setOrder] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/categories")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: unknown) => {
        if (cancelled || !data) return;
        if (Array.isArray(data)) {
          setCategories(data.filter(isCustomCategory));
          return;
        }
        if (typeof data !== "object") return;
        const payload = data as { categories?: unknown; order?: unknown };
        if (Array.isArray(payload.categories)) {
          setCategories(payload.categories.filter(isCustomCategory));
        }
        setOrder(parseCategoryOrder(payload.order));
      })
      .catch(() => {
        /* keep empty list offline */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const addCategory = useCallback(async (label: string) => {
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label }),
    });
    const data = (await res.json().catch(() => null)) as
      | CustomCategory
      | { error?: string }
      | null;
    if (!res.ok || !data || !("id" in data)) {
      throw new Error(
        data && "error" in data && data.error
          ? data.error
          : "Could not add category",
      );
    }
    setCategories((current) =>
      current.some((c) => c.id === data.id) ? current : [...current, data],
    );
    setOrder((current) => {
      if (current.includes(data.id) || current.length === 0) return current;
      return [...current, data.id];
    });
    return data;
  }, []);

  const reorder = useCallback((displayed: string[]) => {
    const next = parseCategoryOrder(displayed);
    setOrder((current) => {
      const seen = new Set(next);
      return [...next, ...current.filter((id) => !seen.has(id))];
    });
    void fetch("/api/categories", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: next }),
    }).catch(() => {
      /* keep optimistic order */
    });
  }, []);

  const deleteCategory = useCallback(async (id: string) => {
    const res = await fetch(`/api/categories/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    const data = (await res.json().catch(() => null)) as
      | { error?: string }
      | null;
    if (!res.ok) {
      throw new Error(data?.error || "Could not delete category");
    }
    setCategories((current) => current.filter((item) => item.id !== id));
    setOrder((current) => current.filter((item) => item !== id));
  }, []);

  const isCustom = useCallback((id: string) => !isBuiltinProtein(id), []);

  const labelFor = useCallback(
    (protein: Protein) => proteinLabel(protein, categories),
    [categories],
  );

  const value = useMemo(
    () => ({
      categories,
      order,
      labelFor,
      addCategory,
      reorder,
      deleteCategory,
      isCustom,
    }),
    [categories, order, labelFor, addCategory, reorder, deleteCategory, isCustom],
  );

  return (
    <CategoriesContext.Provider value={value}>
      {children}
    </CategoriesContext.Provider>
  );
}

export function useCategories() {
  const ctx = useContext(CategoriesContext);
  if (!ctx) {
    throw new Error("useCategories must be used within CategoriesProvider");
  }
  return ctx;
}

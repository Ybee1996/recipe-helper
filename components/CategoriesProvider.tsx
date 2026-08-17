"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { proteinLabel, type CustomCategory, type Protein } from "@/lib/types";

interface CategoriesContextValue {
  categories: CustomCategory[];
  labelFor: (protein: Protein) => string;
  addCategory: (label: string) => Promise<CustomCategory>;
}

const CategoriesContext = createContext<CategoriesContextValue | null>(null);

export function CategoriesProvider({ children }: { children: React.ReactNode }) {
  const [categories, setCategories] = useState<CustomCategory[]>([]);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/categories")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: unknown) => {
        if (cancelled || !Array.isArray(data)) return;
        const next = data.filter(
          (item): item is CustomCategory =>
            Boolean(item) &&
            typeof item === "object" &&
            typeof (item as CustomCategory).id === "string" &&
            typeof (item as CustomCategory).label === "string",
        );
        setCategories(next);
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
    return data;
  }, []);

  const labelFor = useCallback(
    (protein: Protein) => proteinLabel(protein, categories),
    [categories],
  );

  const value = useMemo(
    () => ({ categories, labelFor, addCategory }),
    [categories, labelFor, addCategory],
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

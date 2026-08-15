"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  clearShoppingList,
  loadShoppingItems,
  newShoppingItem,
  saveShoppingItems,
  type ShoppingItem,
} from "@/lib/shopping-list";

interface ShoppingListContextValue {
  items: ShoppingItem[];
  uncheckedCount: number;
  addItem: (input: Omit<ShoppingItem, "id" | "checked">) => void;
  addItems: (inputs: Omit<ShoppingItem, "id" | "checked">[]) => void;
  removeItem: (id: string) => void;
  removeByRecipe: (recipeId: string) => void;
  removeByRecipeName: (recipeId: string, name: string) => void;
  toggleItem: (id: string) => void;
  clearChecked: () => void;
  clearAll: () => void;
}

const ShoppingListContext = createContext<ShoppingListContextValue | null>(null);

export function ShoppingListProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setItems(loadShoppingItems());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    saveShoppingItems(items);
  }, [items, ready]);

  const addItem = useCallback((input: Omit<ShoppingItem, "id" | "checked">) => {
    const name = input.name.trim();
    if (!name) return;
    setItems((prev) => [...prev, newShoppingItem({ ...input, name })]);
  }, []);

  const addItems = useCallback(
    (inputs: Omit<ShoppingItem, "id" | "checked">[]) => {
      const next = inputs
        .map((input) => ({ ...input, name: input.name.trim() }))
        .filter((input) => input.name)
        .map((input) => newShoppingItem(input));
      if (!next.length) return;
      setItems((prev) => [...prev, ...next]);
    },
    [],
  );

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const removeByRecipe = useCallback((recipeId: string) => {
    setItems((prev) => prev.filter((item) => item.recipeId !== recipeId));
  }, []);

  const removeByRecipeName = useCallback((recipeId: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setItems((prev) =>
      prev.filter(
        (item) => !(item.recipeId === recipeId && item.name.trim() === trimmed),
      ),
    );
  }, []);

  const toggleItem = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item,
      ),
    );
  }, []);

  const clearChecked = useCallback(() => {
    setItems((prev) => prev.filter((item) => !item.checked));
  }, []);

  const clearAll = useCallback(() => {
    clearShoppingList();
    setItems([]);
  }, []);

  const uncheckedCount = useMemo(
    () => items.filter((item) => !item.checked).length,
    [items],
  );

  const value = useMemo(
    () => ({
      items,
      uncheckedCount,
      addItem,
      addItems,
      removeItem,
      removeByRecipe,
      removeByRecipeName,
      toggleItem,
      clearChecked,
      clearAll,
    }),
    [
      items,
      uncheckedCount,
      addItem,
      addItems,
      removeItem,
      removeByRecipe,
      removeByRecipeName,
      toggleItem,
      clearChecked,
      clearAll,
    ],
  );

  return (
    <ShoppingListContext.Provider value={value}>
      {children}
    </ShoppingListContext.Provider>
  );
}

export function useShoppingList() {
  const ctx = useContext(ShoppingListContext);
  if (!ctx) {
    throw new Error("useShoppingList must be used within ShoppingListProvider");
  }
  return ctx;
}

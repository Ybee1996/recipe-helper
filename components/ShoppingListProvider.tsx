"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  fetchShoppingList,
  hasSyncedShoppingList,
  loadShoppingItems,
  markShoppingListSynced,
  mergeShoppingLists,
  newShoppingItem,
  postShoppingListOp,
  saveShoppingItems,
  shoppingListsEqual,
  SHOPPING_LIST_STORAGE_KEY,
  type ShoppingItem,
  type ShoppingListOp,
} from "@/lib/shopping-list";
import { recordShoppingHistory } from "@/lib/shopping-history";

interface ShoppingListContextValue {
  items: ShoppingItem[];
  uncheckedCount: number;
  listOpen: boolean;
  openList: () => void;
  closeList: () => void;
  toggleList: () => void;
  addItem: (input: Omit<ShoppingItem, "id" | "checked">) => void;
  addItems: (inputs: Omit<ShoppingItem, "id" | "checked">[]) => void;
  removeItem: (id: string) => void;
  removeByRecipe: (recipeId: string) => void;
  removeByRecipeName: (recipeId: string, name: string) => void;
  updateItemQtys: (updates: { id: string; qty: string }[]) => void;
  toggleItem: (id: string) => void;
  clearChecked: () => void;
  clearAll: () => void;
}

const ShoppingListContext = createContext<ShoppingListContextValue | null>(null);

export function ShoppingListProvider({
  children,
  initialItems = [],
}: {
  children: React.ReactNode;
  initialItems?: ShoppingItem[];
}) {
  const [items, setItems] = useState<ShoppingItem[]>(initialItems);
  const [listOpen, setListOpen] = useState(false);
  const itemsRef = useRef(items);
  const pendingRef = useRef(0);
  const queueRef = useRef(Promise.resolve());
  const retryRef = useRef<ShoppingListOp[]>([]);

  const persist = useCallback((next: ShoppingItem[]) => {
    if (shoppingListsEqual(itemsRef.current, next)) return;
    itemsRef.current = next;
    setItems(next);
    saveShoppingItems(next);
  }, []);

  const sendOp = useCallback(
    (op: ShoppingListOp) => {
      pendingRef.current++;
      queueRef.current = queueRef.current.then(async () => {
        try {
          const next = await postShoppingListOp(op);
          markShoppingListSynced();
          if (pendingRef.current === 1) persist(next);
        } catch {
          retryRef.current.push(op);
        } finally {
          pendingRef.current--;
        }
      });
    },
    [persist],
  );

  const pull = useCallback(async () => {
    if (pendingRef.current > 0) return;
    try {
      if (retryRef.current.length) {
        const retries = retryRef.current.splice(0);
        for (const op of retries) {
          try {
            await postShoppingListOp(op);
          } catch {
            retryRef.current.push(op);
            return;
          }
        }
      }
      const remote = await fetchShoppingList();
      if (pendingRef.current > 0) return;
      if (!hasSyncedShoppingList()) {
        const merged = mergeShoppingLists(itemsRef.current, remote);
        markShoppingListSynced();
        persist(merged.items);
        if (merged.toUpload.length) sendOp({ op: "add", items: merged.toUpload });
        return;
      }
      persist(remote);
    } catch {
      // Stay on the cached list when offline.
    }
  }, [persist, sendOp]);

  useEffect(() => {
    persist(loadShoppingItems());
    void pull();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === "visible") void pull();
    }
    function onStorage(e: StorageEvent) {
      if (e.key !== SHOPPING_LIST_STORAGE_KEY || pendingRef.current > 0) return;
      const next = loadShoppingItems();
      itemsRef.current = next;
      setItems(next);
    }
    window.addEventListener("focus", pull);
    window.addEventListener("online", pull);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("focus", pull);
      window.removeEventListener("online", pull);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("storage", onStorage);
    };
  }, [pull]);

  useEffect(() => {
    if (!listOpen) return;
    void pull();
    const id = window.setInterval(() => void pull(), 8000);
    return () => window.clearInterval(id);
  }, [listOpen, pull]);

  const addItem = useCallback(
    (input: Omit<ShoppingItem, "id" | "checked">) => {
      const name = input.name.trim();
      if (!name) return;
      const item = newShoppingItem({ ...input, name });
      recordShoppingHistory(item.name, item.qty);
      persist([...itemsRef.current, item]);
      sendOp({ op: "add", items: [item] });
    },
    [persist, sendOp],
  );

  const addItems = useCallback(
    (inputs: Omit<ShoppingItem, "id" | "checked">[]) => {
      const next = inputs
        .map((input) => ({ ...input, name: input.name.trim() }))
        .filter((input) => input.name)
        .map((input) => newShoppingItem(input));
      if (!next.length) return;
      for (const item of next) recordShoppingHistory(item.name, item.qty);
      persist([...itemsRef.current, ...next]);
      sendOp({ op: "add", items: next });
    },
    [persist, sendOp],
  );

  const removeItem = useCallback(
    (id: string) => {
      persist(itemsRef.current.filter((item) => item.id !== id));
      sendOp({ op: "remove", ids: [id] });
    },
    [persist, sendOp],
  );

  const removeByRecipe = useCallback(
    (recipeId: string) => {
      persist(itemsRef.current.filter((item) => item.recipeId !== recipeId));
      sendOp({ op: "removeByRecipe", recipeId });
    },
    [persist, sendOp],
  );

  const removeByRecipeName = useCallback(
    (recipeId: string, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      persist(
        itemsRef.current.filter(
          (item) => !(item.recipeId === recipeId && item.name.trim() === trimmed),
        ),
      );
      sendOp({ op: "removeByRecipeName", recipeId, name: trimmed });
    },
    [persist, sendOp],
  );

  const updateItemQtys = useCallback(
    (updates: { id: string; qty: string }[]) => {
      if (!updates.length) return;
      const byId = new Map(
        updates.map((u) => [u.id, u.qty.trim().slice(0, 8)] as const),
      );
      let changed = false;
      const next = itemsRef.current.map((item) => {
        if (!byId.has(item.id)) return item;
        const qty = byId.get(item.id)!;
        if (item.qty === qty) return item;
        changed = true;
        return { ...item, qty };
      });
      if (!changed) return;
      for (const item of next) {
        if (byId.has(item.id)) recordShoppingHistory(item.name, item.qty);
      }
      persist(next);
      sendOp({
        op: "updateQtys",
        updates: [...byId.entries()].map(([id, qty]) => ({ id, qty })),
      });
    },
    [persist, sendOp],
  );

  const toggleItem = useCallback(
    (id: string) => {
      const current = itemsRef.current.find((item) => item.id === id);
      if (!current) return;
      const checked = !current.checked;
      persist(
        itemsRef.current.map((item) =>
          item.id === id ? { ...item, checked } : item,
        ),
      );
      sendOp({ op: "setChecked", id, checked });
    },
    [persist, sendOp],
  );

  const clearChecked = useCallback(() => {
    persist(itemsRef.current.filter((item) => !item.checked));
    sendOp({ op: "clearChecked" });
  }, [persist, sendOp]);

  const clearAll = useCallback(() => {
    persist([]);
    sendOp({ op: "clearAll" });
  }, [persist, sendOp]);

  const uncheckedCount = useMemo(
    () => items.filter((item) => !item.checked).length,
    [items],
  );

  const openList = useCallback(() => setListOpen(true), []);
  const closeList = useCallback(() => setListOpen(false), []);
  const toggleList = useCallback(() => setListOpen((open) => !open), []);

  const value = useMemo(
    () => ({
      items,
      uncheckedCount,
      listOpen,
      openList,
      closeList,
      toggleList,
      addItem,
      addItems,
      removeItem,
      removeByRecipe,
      removeByRecipeName,
      updateItemQtys,
      toggleItem,
      clearChecked,
      clearAll,
    }),
    [
      items,
      uncheckedCount,
      listOpen,
      openList,
      closeList,
      toggleList,
      addItem,
      addItems,
      removeItem,
      removeByRecipe,
      removeByRecipeName,
      updateItemQtys,
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

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
  calendarEntriesEqual,
  fetchCalendar,
  newCalendarEntry,
  postCalendarOp,
  soonestUpcomingDate,
  todayDate,
  type CalendarEntry,
  type CalendarOp,
  type CalendarRecipeOption,
} from "@/lib/calendar";

interface CalendarContextValue {
  entries: CalendarEntry[];
  recipes: CalendarRecipeOption[];
  calendarOpen: boolean;
  openCalendar: () => void;
  closeCalendar: () => void;
  toggleCalendar: () => void;
  addToCalendar: (input: {
    recipeId: string;
    cookDate: string;
    title: string;
    imageUrl?: string | null;
  }) => void;
  removeEntry: (id: string) => void;
  removeUpcomingByRecipe: (recipeId: string) => void;
  isUpcoming: (recipeId: string) => boolean;
  soonestDate: (recipeId: string) => string | null;
  datesForRecipe: (recipeId: string) => string[];
}

const CalendarContext = createContext<CalendarContextValue | null>(null);

export function CalendarProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [recipes, setRecipes] = useState<CalendarRecipeOption[]>([]);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const entriesRef = useRef(entries);
  const pendingRef = useRef(0);
  const queueRef = useRef(Promise.resolve());
  const retryRef = useRef<CalendarOp[]>([]);

  const persist = useCallback((next: CalendarEntry[]) => {
    if (calendarEntriesEqual(entriesRef.current, next)) return;
    entriesRef.current = next;
    setEntries(next);
  }, []);

  const sendOp = useCallback(
    (op: CalendarOp) => {
      pendingRef.current++;
      queueRef.current = queueRef.current.then(async () => {
        try {
          const next = await postCalendarOp(op);
          if (pendingRef.current === 1) {
            persist(next.entries);
            setRecipes(next.recipes);
          }
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
            await postCalendarOp(op);
          } catch {
            retryRef.current.push(op);
            return;
          }
        }
      }
      const remote = await fetchCalendar();
      if (pendingRef.current > 0) return;
      persist(remote.entries);
      setRecipes(remote.recipes);
    } catch {
      // Keep the in-memory calendar when offline.
    }
  }, [persist]);

  useEffect(() => {
    void pull();
  }, [pull]);

  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === "visible") void pull();
    }
    window.addEventListener("focus", pull);
    window.addEventListener("online", pull);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", pull);
      window.removeEventListener("online", pull);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [pull]);

  useEffect(() => {
    if (!calendarOpen) return;
    void pull();
  }, [calendarOpen, pull]);

  const addToCalendar = useCallback(
    (input: {
      recipeId: string;
      cookDate: string;
      title: string;
      imageUrl?: string | null;
    }) => {
      const exists = entriesRef.current.some(
        (entry) =>
          entry.recipeId === input.recipeId && entry.cookDate === input.cookDate,
      );
      if (exists) return;
      const entry = newCalendarEntry(input);
      persist([...entriesRef.current, entry]);
      sendOp({ op: "add", entry });
    },
    [persist, sendOp],
  );

  const removeEntry = useCallback(
    (id: string) => {
      persist(entriesRef.current.filter((entry) => entry.id !== id));
      sendOp({ op: "remove", ids: [id] });
    },
    [persist, sendOp],
  );

  const removeUpcomingByRecipe = useCallback(
    (recipeId: string) => {
      const today = todayDate();
      persist(
        entriesRef.current.filter(
          (entry) =>
            !(entry.recipeId === recipeId && entry.cookDate >= today),
        ),
      );
      sendOp({ op: "removeUpcomingByRecipe", recipeId, today });
    },
    [persist, sendOp],
  );

  const today = todayDate();

  const isUpcoming = useCallback(
    (recipeId: string) =>
      soonestUpcomingDate(entries, recipeId, today) != null,
    [entries, today],
  );

  const soonestDate = useCallback(
    (recipeId: string) => soonestUpcomingDate(entries, recipeId, today),
    [entries, today],
  );

  const datesForRecipe = useCallback(
    (recipeId: string) =>
      entries
        .filter((entry) => entry.recipeId === recipeId)
        .map((entry) => entry.cookDate)
        .sort(),
    [entries],
  );

  const openCalendar = useCallback(() => setCalendarOpen(true), []);
  const closeCalendar = useCallback(() => setCalendarOpen(false), []);
  const toggleCalendar = useCallback(
    () => setCalendarOpen((open) => !open),
    [],
  );

  const value = useMemo(
    () => ({
      entries,
      recipes,
      calendarOpen,
      openCalendar,
      closeCalendar,
      toggleCalendar,
      addToCalendar,
      removeEntry,
      removeUpcomingByRecipe,
      isUpcoming,
      soonestDate,
      datesForRecipe,
    }),
    [
      entries,
      recipes,
      calendarOpen,
      openCalendar,
      closeCalendar,
      toggleCalendar,
      addToCalendar,
      removeEntry,
      removeUpcomingByRecipe,
      isUpcoming,
      soonestDate,
      datesForRecipe,
    ],
  );

  return (
    <CalendarContext.Provider value={value}>{children}</CalendarContext.Provider>
  );
}

export function useCalendar() {
  const ctx = useContext(CalendarContext);
  if (!ctx) {
    throw new Error("useCalendar must be used within CalendarProvider");
  }
  return ctx;
}

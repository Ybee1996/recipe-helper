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
import { usePathname } from "next/navigation";

type NavigationProgressApi = {
  start: () => void;
};

const NavigationProgressContext = createContext<NavigationProgressApi>({
  start: () => {},
});

export function useNavigationProgress() {
  return useContext(NavigationProgressContext);
}

function isInternalNavClick(event: MouseEvent) {
  if (event.defaultPrevented || event.button !== 0) return false;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return false;
  }
  const target = event.target;
  if (!(target instanceof Element)) return false;
  const anchor = target.closest("a");
  if (!anchor || !(anchor instanceof HTMLAnchorElement)) return false;
  if (anchor.target === "_blank" || anchor.hasAttribute("download")) return false;
  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#") || href.startsWith("mailto:")) return false;
  let url: URL;
  try {
    url = new URL(anchor.href);
  } catch {
    return false;
  }
  if (url.origin !== window.location.origin) return false;
  const next = `${url.pathname}${url.search}`;
  const current = `${window.location.pathname}${window.location.search}`;
  return next !== current;
}

export function NavigationProgress({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mode, setMode] = useState<"idle" | "running" | "finishing">("idle");
  const pathRef = useRef(pathname);
  const finishTimer = useRef<number | null>(null);
  const safetyTimer = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    if (finishTimer.current != null) {
      window.clearTimeout(finishTimer.current);
      finishTimer.current = null;
    }
    if (safetyTimer.current != null) {
      window.clearTimeout(safetyTimer.current);
      safetyTimer.current = null;
    }
  }, []);

  const start = useCallback(() => {
    clearTimers();
    setMode("running");
    safetyTimer.current = window.setTimeout(() => setMode("idle"), 15000);
  }, [clearTimers]);

  const finish = useCallback(() => {
    setMode((current) => {
      if (current !== "running") return current;
      return "finishing";
    });
    if (safetyTimer.current != null) {
      window.clearTimeout(safetyTimer.current);
      safetyTimer.current = null;
    }
    finishTimer.current = window.setTimeout(() => setMode("idle"), 240);
  }, []);

  useEffect(() => {
    if (pathRef.current === pathname) return;
    pathRef.current = pathname;
    finish();
  }, [pathname, finish]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (isInternalNavClick(event)) start();
    }
    function onPopState() {
      start();
    }
    // iOS only applies :active after a touchstart listener exists.
    function enableActive() {}
    document.addEventListener("click", onClick);
    window.addEventListener("popstate", onPopState);
    document.addEventListener("touchstart", enableActive, { passive: true });
    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener("popstate", onPopState);
      document.removeEventListener("touchstart", enableActive);
    };
  }, [start]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const api = useMemo(() => ({ start }), [start]);

  return (
    <NavigationProgressContext.Provider value={api}>
      {children}
      {mode !== "idle" ? (
        <div
          className="pointer-events-none fixed inset-x-0 z-[80]"
          style={{ top: "env(safe-area-inset-top, 0px)" }}
          role="progressbar"
          aria-label="Loading page"
          aria-busy="true"
        >
          <div
            className={`h-[3px] origin-left bg-[var(--accent)] shadow-[0_0_8px_var(--accent)] ${
              mode === "finishing" ? "nav-progress-done" : "nav-progress-run"
            }`}
          />
        </div>
      ) : null}
    </NavigationProgressContext.Provider>
  );
}

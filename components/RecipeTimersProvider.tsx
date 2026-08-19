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

export type RecipeTimer = {
  id: string;
  name: string;
  durationMs: number;
  remainingMs: number;
  endsAt: number | null;
  running: boolean;
  ended: boolean;
};

type RecipeTimersContextValue = {
  timers: RecipeTimer[];
  now: number;
  setupOpen: boolean;
  openSetup: () => void;
  closeSetup: () => void;
  addTimer: (name: string, durationMs: number) => void;
  pauseTimer: (id: string) => void;
  resumeTimer: (id: string) => void;
  resetTimer: (id: string) => void;
  deleteTimer: (id: string) => void;
  remainingOf: (timer: RecipeTimer) => number;
  setCookAwake: (on: boolean) => void;
  registerChipHost: () => () => void;
  chipHosts: number;
};

const STORAGE_KEY = "recipe-helper.timers";
const RecipeTimersContext = createContext<RecipeTimersContextValue | null>(null);

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `timer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function remainingOfTimer(timer: RecipeTimer, now: number): number {
  if (timer.ended) return 0;
  if (timer.running && timer.endsAt != null) {
    return Math.max(0, timer.endsAt - now);
  }
  return Math.max(0, timer.remainingMs);
}

function isStoredTimer(value: unknown): value is RecipeTimer {
  if (!value || typeof value !== "object") return false;
  const t = value as Record<string, unknown>;
  return (
    typeof t.id === "string" &&
    typeof t.name === "string" &&
    typeof t.durationMs === "number" &&
    typeof t.remainingMs === "number" &&
    (t.endsAt === null || typeof t.endsAt === "number") &&
    typeof t.running === "boolean" &&
    typeof t.ended === "boolean"
  );
}

function loadStoredTimers(): RecipeTimer[] {
  if (typeof sessionStorage === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const now = Date.now();
    return parsed.filter(isStoredTimer).map((timer) => {
      if (timer.ended) {
        return { ...timer, running: false, remainingMs: 0, endsAt: null };
      }
      if (timer.running && timer.endsAt != null && timer.endsAt <= now) {
        return { ...timer, running: false, ended: true, remainingMs: 0, endsAt: null };
      }
      return timer;
    });
  } catch {
    return [];
  }
}

function persistTimers(timers: RecipeTimer[]) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(timers));
  } catch {
    // Private mode / quota — timers still work for this session.
  }
}

type WakeLockSentinelLike = {
  released: boolean;
  release: () => Promise<void>;
};

async function requestWakeLock(): Promise<WakeLockSentinelLike | null> {
  const nav = navigator as Navigator & {
    wakeLock?: {
      request: (type: "screen") => Promise<WakeLockSentinelLike>;
    };
  };
  if (!nav.wakeLock) return null;
  try {
    return await nav.wakeLock.request("screen");
  } catch {
    return null;
  }
}

type AudioContextCtor = new (contextOptions?: AudioContextOptions) => AudioContext;

function getAudioContextCtor(): AudioContextCtor | null {
  if (typeof window === "undefined") return null;
  const win = window as unknown as {
    AudioContext?: AudioContextCtor;
    webkitAudioContext?: AudioContextCtor;
  };
  return win.AudioContext ?? win.webkitAudioContext ?? null;
}

function vibrateAlarm() {
  try {
    navigator.vibrate?.([180, 80, 180, 80, 180, 80, 240]);
  } catch {
    // Vibration is best-effort.
  }
}

function playBeepBurst(ctx: AudioContext) {
  const now = ctx.currentTime;
  const beeps = 4;
  for (let i = 0; i < beeps; i += 1) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = i === beeps - 1 ? 988 : 880;
    gain.gain.setValueAtTime(0.0001, now);
    const start = now + i * 0.38;
    const end = start + 0.16;
    gain.gain.exponentialRampToValueAtTime(0.12, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(end + 0.02);
  }
}

export function RecipeTimersProvider({ children }: { children: React.ReactNode }) {
  const [timers, setTimers] = useState<RecipeTimer[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [setupOpen, setSetupOpen] = useState(false);
  const [cookAwake, setCookAwake] = useState(false);
  const [chipHosts, setChipHosts] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const wakeLockRef = useRef<WakeLockSentinelLike | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const alarmedRef = useRef(new Set<string>());

  useEffect(() => {
    const stored = loadStoredTimers();
    if (stored.length) setTimers(stored);
    for (const timer of stored) {
      if (timer.ended) alarmedRef.current.add(timer.id);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    persistTimers(timers);
  }, [timers, hydrated]);

  const anyRunning = timers.some((timer) => timer.running && !timer.ended);
  const keepAwake = cookAwake || anyRunning;

  useEffect(() => {
    if (!anyRunning) return;
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      setTimers((prev) => {
        let changed = false;
        const next = prev.map((timer) => {
          if (!timer.running || timer.ended || timer.endsAt == null) return timer;
          if (timer.endsAt > t) return timer;
          changed = true;
          return {
            ...timer,
            running: false,
            ended: true,
            remainingMs: 0,
            endsAt: null,
          };
        });
        return changed ? next : prev;
      });
    }, 250);
    return () => window.clearInterval(id);
  }, [anyRunning]);

  useEffect(() => {
    for (const timer of timers) {
      if (!timer.ended || alarmedRef.current.has(timer.id)) continue;
      alarmedRef.current.add(timer.id);
      vibrateAlarm();
      const ctx = audioRef.current;
      if (ctx && ctx.state !== "closed") {
        void ctx.resume().then(() => playBeepBurst(ctx)).catch(() => {});
      } else {
        const Ctor = getAudioContextCtor();
        if (!Ctor) continue;
        try {
          const fresh = new Ctor();
          audioRef.current = fresh;
          void fresh.resume().then(() => playBeepBurst(fresh)).catch(() => {});
        } catch {
          // Audio is best-effort.
        }
      }
    }
  }, [timers]);

  const releaseWakeLock = useCallback(async () => {
    const sentinel = wakeLockRef.current;
    wakeLockRef.current = null;
    if (!sentinel || sentinel.released) return;
    try {
      await sentinel.release();
    } catch {
      // Unsupported / already released.
    }
  }, []);

  const acquireWakeLock = useCallback(async () => {
    const sentinel = await requestWakeLock();
    if (sentinel) wakeLockRef.current = sentinel;
  }, []);

  useEffect(() => {
    if (!keepAwake) {
      void releaseWakeLock();
      return;
    }
    void acquireWakeLock();
    function onVisibility() {
      if (document.visibilityState === "visible") void acquireWakeLock();
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [keepAwake, acquireWakeLock, releaseWakeLock]);

  useEffect(() => {
    return () => {
      void releaseWakeLock();
    };
  }, [releaseWakeLock]);

  const unlockAudio = useCallback(() => {
    const Ctor = getAudioContextCtor();
    if (!Ctor) return;
    if (!audioRef.current || audioRef.current.state === "closed") {
      try {
        audioRef.current = new Ctor();
      } catch {
        return;
      }
    }
    void audioRef.current.resume().catch(() => {});
  }, []);

  const addTimer = useCallback(
    (name: string, durationMs: number) => {
      unlockAudio();
      const trimmed = name.trim() || "Timer";
      const id = newId();
      const endsAt = Date.now() + durationMs;
      setNow(Date.now());
      setTimers((prev) => [
        ...prev,
        {
          id,
          name: trimmed,
          durationMs,
          remainingMs: durationMs,
          endsAt,
          running: true,
          ended: false,
        },
      ]);
    },
    [unlockAudio],
  );

  const pauseTimer = useCallback((id: string) => {
    const t = Date.now();
    setNow(t);
    setTimers((prev) =>
      prev.map((timer) => {
        if (timer.id !== id || timer.ended || !timer.running) return timer;
        return {
          ...timer,
          running: false,
          remainingMs: remainingOfTimer(timer, t),
          endsAt: null,
        };
      }),
    );
  }, []);

  const resumeTimer = useCallback((id: string) => {
    unlockAudio();
    const t = Date.now();
    setNow(t);
    setTimers((prev) =>
      prev.map((timer) => {
        if (timer.id !== id || timer.ended || timer.running) return timer;
        const left = Math.max(0, timer.remainingMs);
        if (left <= 0) {
          return { ...timer, ended: true, remainingMs: 0, endsAt: null, running: false };
        }
        return {
          ...timer,
          running: true,
          endsAt: t + left,
        };
      }),
    );
  }, [unlockAudio]);

  const resetTimer = useCallback((id: string) => {
    alarmedRef.current.delete(id);
    const t = Date.now();
    setNow(t);
    setTimers((prev) =>
      prev.map((timer) => {
        if (timer.id !== id) return timer;
        return {
          ...timer,
          remainingMs: timer.durationMs,
          endsAt: null,
          running: false,
          ended: false,
        };
      }),
    );
  }, []);

  const deleteTimer = useCallback((id: string) => {
    alarmedRef.current.delete(id);
    setTimers((prev) => prev.filter((timer) => timer.id !== id));
  }, []);

  const remainingOf = useCallback(
    (timer: RecipeTimer) => remainingOfTimer(timer, now),
    [now],
  );

  const registerChipHost = useCallback(() => {
    setChipHosts((n) => n + 1);
    return () => setChipHosts((n) => Math.max(0, n - 1));
  }, []);

  const value = useMemo<RecipeTimersContextValue>(
    () => ({
      timers,
      now,
      setupOpen,
      openSetup: () => {
        unlockAudio();
        setSetupOpen(true);
      },
      closeSetup: () => setSetupOpen(false),
      addTimer,
      pauseTimer,
      resumeTimer,
      resetTimer,
      deleteTimer,
      remainingOf,
      setCookAwake,
      registerChipHost,
      chipHosts,
    }),
    [
      timers,
      now,
      setupOpen,
      addTimer,
      pauseTimer,
      resumeTimer,
      resetTimer,
      deleteTimer,
      remainingOf,
      registerChipHost,
      chipHosts,
      unlockAudio,
    ],
  );

  return (
    <RecipeTimersContext.Provider value={value}>{children}</RecipeTimersContext.Provider>
  );
}

export function useRecipeTimers(): RecipeTimersContextValue {
  const ctx = useContext(RecipeTimersContext);
  if (!ctx) {
    throw new Error("useRecipeTimers must be used within RecipeTimersProvider");
  }
  return ctx;
}

export function formatTimerRemaining(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

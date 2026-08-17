"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useNavigationProgress } from "@/components/NavigationProgress";
import { safeReturnPath } from "@/lib/safe-return-path";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { start: startNav } = useNavigationProgress();
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error || "Could not sign in");
        setPending(false);
        return;
      }
      startNav();
      router.replace(safeReturnPath(searchParams.get("from")));
      router.refresh();
    } catch {
      setError("Could not sign in");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-8">
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold">Password</span>
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full rounded-2xl border border-[var(--line)] bg-[var(--card)] px-4 py-3.5 text-base outline-none ring-[var(--accent)] placeholder:text-[var(--muted)] focus:ring-2"
        />
      </label>

      {error ? <p className="mt-4 text-sm text-[var(--accent)]">{error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-5 w-full rounded-2xl bg-[var(--accent)] px-4 py-3.5 text-base font-semibold text-white disabled:opacity-60 lg:hover:bg-[var(--accent-dark)]"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { PROTEIN_LABELS, type Protein } from "@/lib/types";

type ChatRecipe = {
  id: string;
  title: string;
  protein: string;
  kcal?: number;
  protein_g?: number;
};

type Message = {
  role: "user" | "assistant";
  content: string;
  recipes?: ChatRecipe[];
};

const SUGGESTIONS = [
  "High protein chicken",
  "Beef with no dairy",
  "Something with spinach",
  "Gluten-free noodles",
];

function renderAnswer(text: string) {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, i) => {
    const m = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (!m) return <span key={i}>{part}</span>;
    return (
      <Link
        key={i}
        href={`/recipe/${m[2]}`}
        className="font-semibold text-[var(--accent)] underline decoration-[var(--line)] underline-offset-2"
      >
        {m[1]}
      </Link>
    );
  });
}

export function ChatClient() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  async function send(text: string) {
    const content = text.trim();
    if (!content || pending) return;
    setError(null);
    setInput("");
    const next: Message[] = [...messages, { role: "user", content }];
    setMessages(next);
    setPending(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map(({ role, content }) => ({ role, content })),
        }),
      });
      const data = (await res.json()) as {
        answer?: string;
        recipes?: ChatRecipe[];
        error?: string;
      };
      if (!res.ok) {
        setError(data.error || "Chat failed");
        return;
      }
      setMessages([
        ...next,
        {
          role: "assistant",
          content: data.answer || "",
          recipes: data.recipes,
        },
      ]);
    } catch {
      setError("Could not reach the assistant.");
    } finally {
      setPending(false);
      queueMicrotask(() =>
        endRef.current?.scrollIntoView({ behavior: "smooth" }),
      );
    }
  }

  return (
    <div className="flex min-h-[calc(100dvh-5.5rem)] flex-col px-4 pt-5 lg:mx-auto lg:min-h-dvh lg:max-w-3xl lg:px-10 lg:pt-10">
      <header className="mb-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
          Assistant
        </p>
        <h1
          className="mt-1 text-3xl font-medium tracking-tight lg:text-4xl"
          style={{ fontFamily: "var(--font-display), Georgia, serif" }}
        >
          Ask your recipes
        </h1>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto pb-4">
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                className="rounded-full bg-[var(--chip)] px-3.5 py-2 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent)] lg:hover:bg-[var(--line)]"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "text-right" : ""}>
            <div
              className={`inline-block max-w-[92%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-left text-[0.95rem] leading-relaxed lg:max-w-[75%] ${
                m.role === "user"
                  ? "bg-[var(--ink)] text-[var(--paper)]"
                  : "bg-[var(--card)] border border-[var(--line)]"
              }`}
            >
              {m.role === "assistant" ? renderAnswer(m.content) : m.content}
            </div>
            {m.recipes && m.recipes.length > 0 && (
              <ul className="mt-2 space-y-2 text-left">
                {m.recipes.map((r) => (
                  <li key={r.id}>
                    <Link
                      href={`/recipe/${r.id}`}
                      className="block rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 py-2 lg:transition-colors lg:hover:border-[var(--accent)]"
                    >
                      <span className="font-semibold">{r.title}</span>
                      <span className="mt-0.5 block text-xs text-[var(--muted)]">
                        {PROTEIN_LABELS[r.protein as Protein] ?? r.protein}
                        {r.protein_g ? ` · ${r.protein_g}g protein` : ""}
                        {r.kcal ? ` · ${r.kcal} kcal` : ""}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
        {pending && (
          <p className="text-sm text-[var(--muted)]">Looking through your box…</p>
        )}
        {error && <p className="text-sm text-[var(--accent)]">{error}</p>}
        <div ref={endRef} />
      </div>

      <form
        className="sticky bottom-16 -mx-4 border-t border-[var(--line)] bg-[var(--paper)] px-4 py-3 lg:-mx-10 lg:bottom-0 lg:px-10 lg:py-4"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. chicken, no dairy"
            className="flex-1 rounded-2xl border border-[var(--line)] bg-[var(--card)] px-4 py-3 outline-none ring-[var(--accent)] focus:ring-2"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-2xl bg-[var(--accent)] px-4 py-3 font-semibold text-white disabled:opacity-50"
          >
            Go
          </button>
        </div>
      </form>
    </div>
  );
}

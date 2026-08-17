"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Spinner } from "@/components/Spinner";

export function BusyScreen({
  title,
  messages,
  detail,
  onCancel,
  cancelLabel = "Cancel",
}: {
  title: string;
  messages: string[];
  detail?: string;
  onCancel?: () => void;
  cancelLabel?: string;
}) {
  const [mounted, setMounted] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    if (messages.length < 2) return;
    const id = window.setInterval(() => {
      setIndex((current) => Math.min(current + 1, messages.length - 1));
    }, 4500);
    return () => window.clearInterval(id);
  }, [messages.length]);

  if (!mounted) return null;

  const message = messages[index] ?? messages[0] ?? title;

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-[var(--paper)]/92 px-6 backdrop-blur-[2px]"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-labelledby="busy-screen-title"
    >
      <div className="w-full max-w-sm rounded-3xl border border-[var(--line)] bg-[var(--card)] px-6 py-8 text-center shadow-lg">
        <Spinner size={36} className="mx-auto text-[var(--accent)]" />
        <h2
          id="busy-screen-title"
          className="mt-5 text-2xl font-medium tracking-tight"
          style={{ fontFamily: "var(--font-display), Georgia, serif" }}
        >
          {title}
        </h2>
        <p className="mt-2 text-sm font-semibold text-[var(--ink)]">{message}</p>
        {detail ? (
          <p className="mt-1.5 text-sm text-[var(--muted)]">{detail}</p>
        ) : null}
        <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-[var(--chip)]">
          <div className="busy-bar h-full w-1/3 rounded-full bg-[var(--accent)]" />
        </div>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="mt-6 rounded-2xl px-4 py-2.5 text-sm font-semibold text-[var(--muted)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] lg:hover:text-[var(--ink)]"
          >
            {cancelLabel}
          </button>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

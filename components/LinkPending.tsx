"use client";

import { useLinkStatus } from "next/link";
import { Spinner } from "@/components/Spinner";

export function CardLinkPending() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <span className="absolute inset-0 z-[1] grid place-items-center rounded-[inherit] bg-[var(--paper)]/55">
      <Spinner size={22} className="text-[var(--accent)]" />
    </span>
  );
}

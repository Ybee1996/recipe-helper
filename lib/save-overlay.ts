"use client";

import type { UserRecipeOverlay } from "@/lib/types";

export async function saveOverlay(
  recipeId: string,
  patch: UserRecipeOverlay,
): Promise<UserRecipeOverlay> {
  const res = await fetch(`/api/user/${recipeId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error || "Could not save");
  }
  return (await res.json()) as UserRecipeOverlay;
}

import { Spinner } from "@/components/Spinner";

export default function Loading() {
  return (
    <div
      className="grid min-h-[60dvh] place-items-center px-4"
      role="status"
      aria-label="Loading"
    >
      <div className="flex flex-col items-center gap-3">
        <Spinner size={28} className="text-[var(--accent)]" />
        <p className="text-sm font-semibold text-[var(--muted)]">Loading…</p>
      </div>
    </div>
  );
}

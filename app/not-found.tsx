import Link from "next/link";

export default function NotFound() {
  return (
    <div className="px-4 pt-16 text-center">
      <h1
        className="text-2xl font-medium"
        style={{ fontFamily: "var(--font-display), Georgia, serif" }}
      >
        Recipe not found
      </h1>
      <Link href="/" className="mt-4 inline-block font-semibold text-[var(--accent)]">
        Back to recipes
      </Link>
    </div>
  );
}

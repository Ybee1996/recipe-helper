export function SourceRecipeLink({
  url,
  className = "",
}: {
  url: string;
  className?: string;
}) {
  let host = url;
  try {
    host = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    // keep raw url for title fallback
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={`Original recipe on ${host}`}
      aria-label={`View original recipe on ${host}`}
      className={`inline-flex size-9 shrink-0 items-center justify-center rounded-full text-[var(--muted)] transition-colors hover:bg-[var(--chip)] hover:text-[var(--accent)] ${className}`.trim()}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M10.5 2.5H13.5V5.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M6.75 9.25L13.25 2.75"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M11.5 8.5V12.5C11.5 13.05 11.05 13.5 10.5 13.5H3.5C2.95 13.5 2.5 13.05 2.5 12.5V5.5C2.5 4.95 2.95 4.5 3.5 4.5H7.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </a>
  );
}

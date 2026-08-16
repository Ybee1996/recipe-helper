export function BasketIcon({
  size = 16,
  count,
}: {
  size?: number;
  count?: number | string;
}) {
  const label =
    count == null || count === 0 || count === "0"
      ? ""
      : typeof count === "number"
        ? count > 99
          ? "99+"
          : String(count)
        : count;
  const badged = label.length > 0;
  const wide = label.length > 1;

  return (
    <svg
      width={badged ? Math.round((size * 20) / 16) : size}
      height={badged ? Math.round((size * 18) / 16) : size}
      viewBox={badged ? "0 0 20 18" : "0 0 16 16"}
      fill="none"
      aria-hidden="true"
    >
      <g transform={badged ? "translate(0 2)" : undefined}>
        <path
          d="M2.5 5.5h11l-.85 6.2a1.5 1.5 0 0 1-1.49 1.3H4.84a1.5 1.5 0 0 1-1.49-1.3L2.5 5.5Z"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <path
          d="M5.5 5.5V4a2.5 2.5 0 0 1 5 0v1.5"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </g>
      {badged ? (
        <>
          {wide ? (
            <rect
              x="10.1"
              y="0.4"
              width="9.6"
              height="8.2"
              rx="4.1"
              fill="var(--accent)"
            />
          ) : (
            <circle cx="14.2" cy="4.5" r="4.1" fill="var(--accent)" />
          )}
          <text
            x={wide ? 14.9 : 14.2}
            y="7.15"
            textAnchor="middle"
            fill="#fff"
            fontSize="6.4"
            fontWeight="700"
            style={{ fontFamily: "var(--font-sans), system-ui, sans-serif" }}
          >
            {label}
          </text>
        </>
      ) : null}
    </svg>
  );
}

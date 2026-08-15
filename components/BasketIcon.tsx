export function BasketIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
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
    </svg>
  );
}

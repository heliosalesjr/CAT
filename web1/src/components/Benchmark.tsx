/**
 * Survey benchmark: the crosshair a cartographer drops on a fixed
 * point. Used sparingly, where the page wants to say "here".
 */
export function Benchmark({
  className = "",
  color = "var(--color-gold-deep)",
}: {
  className?: string;
  color?: string;
}) {
  return (
    <svg className={`benchmark ${className}`} viewBox="0 0 34 34" fill="none" aria-hidden="true">
      <circle cx="17" cy="17" r="6.5" stroke={color} strokeWidth="1" />
      <path d="M17 0v9M17 25v9M0 17h9M25 17h9" stroke={color} strokeWidth="1" />
      <circle cx="17" cy="17" r="1.6" fill={color} />
    </svg>
  );
}

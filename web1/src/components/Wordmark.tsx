type Props = {
  size?: "sm" | "md" | "lg";
  /** "paper" reverses the mark out of a navy ground. */
  tone?: "navy" | "paper";
};

/**
 * Expanded "CLASS ACT" over condensed, wide-tracked "TALENT" — the
 * same serif/sans contrast the logo has, rebuilt out of one variable
 * family's width axis.
 */
export function Wordmark({ size = "md", tone = "navy" }: Props) {
  const top = size === "lg" ? 26 : size === "sm" ? 15 : 18;
  const bottom = size === "lg" ? 12 : size === "sm" ? 8.5 : 9.5;

  return (
    <span
      className="inline-flex flex-col leading-none"
      aria-label="Class Act Talent"
    >
      <span
        style={{
          fontVariationSettings: '"wdth" 118',
          fontWeight: 700,
          fontSize: top,
          letterSpacing: "0.01em",
          textTransform: "uppercase",
          color: tone === "paper" ? "var(--color-paper)" : "var(--color-navy)",
        }}
      >
        Class Act
      </span>
      <span
        style={{
          fontVariationSettings: '"wdth" 72',
          fontWeight: 500,
          fontSize: bottom,
          letterSpacing: "0.52em",
          textTransform: "uppercase",
          color: tone === "paper" ? "var(--color-teal)" : "var(--color-teal-ink)",
          marginTop: size === "lg" ? 6 : 4,
        }}
      >
        Talent
      </span>
    </span>
  );
}

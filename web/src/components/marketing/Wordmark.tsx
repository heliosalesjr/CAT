type Props = {
  color?: "navy" | "white";
  size?: "sm" | "md" | "lg";
};

export function Wordmark({ color = "navy", size = "md" }: Props) {
  const tone = color === "navy" ? "text-[var(--color-navy)]" : "text-white";
  const serifSize =
    size === "lg" ? "text-[26px]" : size === "sm" ? "text-[17px]" : "text-[20px]";
  const trackSize =
    size === "lg" ? "text-[13px]" : size === "sm" ? "text-[10px]" : "text-[11px]";

  return (
    <span className={`wordmark ${tone}`} aria-label="Class Act Talent">
      <span
        className={`wordmark-serif ${serifSize} !text-current`}
        style={{ letterSpacing: "-0.01em" }}
      >
        Class Act
      </span>
      <span
        className={`wordmark-track ${trackSize} !text-current`}
        style={{ opacity: 0.85 }}
      >
        Talent
      </span>
    </span>
  );
}

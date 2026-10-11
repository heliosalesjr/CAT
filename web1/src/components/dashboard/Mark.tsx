/**
 * The brand's small marks.
 *
 * Drawn here rather than pulled from an icon library on purpose. The site
 * already has its own hand: Benchmark in the marketing pages is "the crosshair
 * a cartographer drops on a fixed point", single-weight hairlines on a square
 * grid. A pin from react-icons would be the same pin every other product uses,
 * and it would arrive with a filled, rounded, 24px-grid vocabulary that fights
 * everything around it. Two shapes are not worth a dependency; a recognisable
 * hand is worth drawing.
 *
 * Both are built from the same parts as Benchmark — a hairline outline, a
 * solid centre, nothing filled that does not need to be — so they read as one
 * family when the star turns up beside the pin later.
 */

type Props = {
  size?: number;
  className?: string;
  title?: string;
  /** Stroke weight. The hairline 1.4 is the family default; heavier reads as
      a stamp rather than as map furniture. */
  weight?: number;
};

/** "Here." Used to tie a selection to what it opened. */
export function PinMark({ size = 20, className = "", title, weight = 1.4 }: Props) {
  return (
    <svg className={`mark ${className}`} width={size} height={size} viewBox="0 0 24 24"
         fill="none" role={title ? "img" : undefined}
         aria-label={title} aria-hidden={title ? undefined : true}>
      {/* The teardrop as a survey pin: a circle on a stem, not a balloon. */}
      <path d="M12 22.5c0 0-7-7.1-7-12.1a7 7 0 1 1 14 0c0 5-7 12.1-7 12.1Z"
            stroke="currentColor" strokeWidth={weight} strokeLinejoin="round" />
      <circle cx="12" cy="10" r="2.7" fill="currentColor" />
    </svg>
  );
}

/** Kept beside the pin so the two are drawn by the same hand when ratings land. */
export function StarMark({ size = 20, className = "", title, weight = 1.4, filled = false }:
  Props & { filled?: boolean }) {
  return (
    <svg className={`mark ${className}`} width={size} height={size} viewBox="0 0 24 24"
         fill="none" role={title ? "img" : undefined}
         aria-label={title} aria-hidden={title ? undefined : true}>
      <path d="M12 3.2l2.62 5.63 6.13.78-4.52 4.2 1.16 6.07L12 16.95 6.61 19.88l1.16-6.07L3.25 9.6l6.13-.78L12 3.2Z"
            stroke="currentColor" strokeWidth={weight} strokeLinejoin="round"
            fill={filled ? "currentColor" : "none"} />
    </svg>
  );
}

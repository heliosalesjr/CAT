import { SHEETS } from "./terrain-data";
import { CONTOUR_BOX } from "./terrain-meta";
import { currentSheet } from "./sheet";

type Props = {
  className?: string;
  /** Crop into the 1200x800 terrain. Different crops read as different places. */
  viewBox?: string;
  /** Which elevations to draw. Fewer lines = quieter texture. */
  levels?: readonly number[];
  /** Elevations drawn in the signal colour instead of the base line. */
  highlight?: readonly number[];
  strokeWidth?: number;
  opacity?: number;
  preserveAspectRatio?: string;
};

/**
 * The terrain itself. Every section is a crop of the same sheet, so the
 * page reads as one place seen at different scales rather than a set of
 * unrelated backgrounds.
 */
export function Contours({
  className = "",
  viewBox = `0 0 ${CONTOUR_BOX.width} ${CONTOUR_BOX.height}`,
  levels,
  highlight = [],
  strokeWidth = 1,
  opacity = 1,
  preserveAspectRatio = "xMidYMid slice",
}: Props) {
  const sheet = SHEETS[currentSheet()];
  const draw = levels ?? sheet.map((_, i) => i);

  return (
    <svg
      className={`contours ${className}`}
      viewBox={viewBox}
      preserveAspectRatio={preserveAspectRatio}
      fill="none"
      aria-hidden="true"
      style={{ opacity }}
    >
      {draw.map((i) => {
        const d = sheet[i];
        if (!d) return null;
        const lit = highlight.includes(i);
        return (
          <path
            key={i}
            d={d}
            stroke={lit ? "var(--signal)" : "var(--contour)"}
            strokeWidth={lit ? strokeWidth * 1.35 : strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            /* Higher ground sits slightly brighter, the way a real
               hypsometric map lightens towards the summit. */
            opacity={lit ? 0.9 : 0.35 + (i / sheet.length) * 0.65}
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
    </svg>
  );
}

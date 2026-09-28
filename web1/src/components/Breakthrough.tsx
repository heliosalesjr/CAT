import { Benchmark } from "./Benchmark";
import { Contours } from "./Contours";

/**
 * The one navy sheet on the page.
 *
 * The brand uses navy for structure — header, footer, headlines — so
 * inverting here for the manifesto is on-palette rather than a second
 * visual language, and it gives a long light scroll a change of
 * pressure at the point the page makes its claim.
 */
export function Breakthrough() {
  return (
    <section
      className="relative overflow-hidden"
      style={
        {
          background: "var(--color-navy)",
          "--contour": "#27436a",
          "--signal": "#81c4cf",
        } as React.CSSProperties
      }
    >
      <Contours
        className="opacity-95"
        viewBox="180 120 860 560"
        strokeWidth={1}
        highlight={[10]}
      />

      <div className="wrap relative py-24 md:py-32">
        <div className="relative max-w-[42em]">
          <Benchmark className="!-left-1 !-top-12 !h-7 !w-7" color="var(--color-gold)" />
          <span className="label" style={{ color: "var(--color-gold)" }}>
            Manifesto · 01
          </span>
          <p
            className="manifesto mt-7"
            style={{ color: "var(--color-paper)" }}
          >
            A teacher moving countries deserves more than a spreadsheet. A
            school entrusting its students deserves more than a résumé.
          </p>
        </div>
      </div>
    </section>
  );
}

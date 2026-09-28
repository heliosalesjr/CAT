const STATS = [
  { number: "37", suffix: "countries", label: "on-platform school demand" },
  { number: "2,400+", suffix: "", label: "vetted teachers in the roster" },
  { number: "94%", suffix: "", label: "of candidates receive real feedback" },
];

export function Stats() {
  return (
    <section className="wrap py-16 md:py-20">
      <div className="mb-12">
        <span className="label">Where we are today</span>
        <h2 className="display-md mt-6 max-w-[18em]">Small on purpose. Growing on merit.</h2>
      </div>

      <div className="grid gap-x-14 gap-y-10 md:grid-cols-3">
        {STATS.map((s) => (
          <div
            key={s.label}
            className="border-t border-[color:var(--color-navy)] pt-6"
          >
            <span
              className="flex items-baseline gap-3"
              style={{
                fontVariationSettings: '"wdth" 118',
                fontWeight: 700,
                fontSize: "clamp(2.6rem, 5vw, 3.9rem)",
                lineHeight: 0.9,
                letterSpacing: "-0.022em",
                fontVariantNumeric: "tabular-nums",
                color: "var(--color-navy)",
              }}
            >
              {s.number}
              {s.suffix && (
                <span
                  style={{
                    fontVariationSettings: '"wdth" 74',
                    fontWeight: 600,
                    fontSize: "0.24em",
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "var(--color-gold-deep)",
                  }}
                >
                  {s.suffix}
                </span>
              )}
            </span>
            <p className="body mt-4 !text-[color:var(--color-navy-3)]">
              {s.label}
            </p>
          </div>
        ))}
      </div>

      <p className="readout mt-12">
        Numbers as of Sep 2026 · placeholders pending audit before public launch.
      </p>
    </section>
  );
}

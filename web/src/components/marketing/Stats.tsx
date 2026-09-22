const STATS = [
  {
    number: "37",
    suffix: " countries",
    label: "on-platform school demand",
    accent: "gold",
  },
  {
    number: "2,400+",
    suffix: "",
    label: "vetted teachers in the roster",
    accent: "teal",
  },
  {
    number: "94%",
    suffix: "",
    label: "of candidates receive real feedback",
    accent: "green",
  },
];

const accentMap = {
  gold: "var(--color-gold-deep)",
  teal: "#1f5b66",
  green: "#2d6a45",
};

export function Stats() {
  return (
    <section className="py-16 md:py-20">
      <div className="wrap">
        <div className="max-w-xl mb-10">
          <span className="eyebrow">Where we are today</span>
          <h2
            className="mt-4 font-display font-semibold text-[color:var(--color-navy)]"
            style={{
              fontSize: "clamp(26px, 3.2vw, 36px)",
              lineHeight: 1.2,
              margin: 0,
            }}
          >
            Small on purpose. Growing on merit.
          </h2>
        </div>

        <div className="grid gap-8 md:gap-12 md:grid-cols-3">
          {STATS.map((s) => (
            <div
              key={s.label}
              className="flex flex-col gap-3 pt-6 border-t border-[color:var(--color-line)]"
            >
              <span
                className="font-display font-semibold"
                style={{
                  fontSize: "clamp(48px, 6vw, 68px)",
                  lineHeight: 1,
                  letterSpacing: "-0.02em",
                  color: "var(--color-navy)",
                }}
              >
                {s.number}
                <span
                  style={{
                    color: accentMap[s.accent as keyof typeof accentMap],
                    fontStyle: "italic",
                    fontWeight: 500,
                    fontSize: "0.55em",
                  }}
                >
                  {s.suffix}
                </span>
              </span>
              <p className="text-[14.5px] text-[color:var(--color-ink-soft)] leading-[1.5]">
                {s.label}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-10 text-[12.5px] text-[color:var(--color-ink-mute)]">
          Numbers as of Sep 2026 · placeholders pending audit before public
          launch.
        </p>
      </div>
    </section>
  );
}

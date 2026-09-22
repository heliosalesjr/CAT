type Feature = {
  title: string;
  desc: string;
  icon: React.ReactNode;
  tint: "green" | "teal" | "gold";
};

const FEATURES: Feature[] = [
  {
    title: "Explainable matches, always.",
    desc: "Every AI suggestion is shown with the reasons behind it. Schools can disable ranking with one toggle and browse candidates unordered.",
    tint: "gold",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
        <path
          d="M12 2l2.5 6.5L21 10l-5 4 1.5 7L12 17.5 6.5 21 8 14l-5-4 6.5-1.5L12 2z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    title: "No more silence.",
    desc: "The platform nudges schools to give real feedback on stalled applications, and teachers always know where they stand in the pipeline.",
    tint: "teal",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
        <path
          d="M21 11.5a8.5 8.5 0 01-12.9 7.3L3 21l2.2-5A8.5 8.5 0 1121 11.5z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    title: "Roles that reflect reality.",
    desc: "HR, principal, coordinator — each with the right permissions from day one. RBAC baked into the schema, not layered as an afterthought.",
    tint: "green",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
        <path
          d="M12 12a4 4 0 100-8 4 4 0 000 8zM4 20a8 8 0 1116 0"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    title: "Documents you can trust.",
    desc: "Sensitive uploads live in an isolated bucket with signed URLs and access logs. Deletion is a first-class feature, not a support ticket.",
    tint: "gold",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
        <path
          d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M9 12l2 2 4-4"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
];

const tintMap = {
  gold: {
    bg: "var(--color-cream)",
    fg: "var(--color-gold-deep)",
    border: "var(--color-line)",
  },
  teal: {
    bg: "var(--color-teal-soft)",
    fg: "#1f5b66",
    border: "#c9dfe2",
  },
  green: {
    bg: "var(--color-green-soft)",
    fg: "#2d6a45",
    border: "#c3e0cc",
  },
};

export function FeatureGrid() {
  return (
    <section className="py-16 md:py-20">
      <div className="wrap">
        <div className="max-w-2xl mb-12">
          <span className="eyebrow">What we built differently</span>
          <h2
            className="mt-4 font-display font-semibold text-[color:var(--color-navy)]"
            style={{
              fontSize: "clamp(28px, 3.4vw, 40px)",
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
              margin: 0,
            }}
          >
            The infrastructure the category{" "}
            <span
              style={{
                fontStyle: "italic",
                color: "var(--color-navy-soft)",
                fontWeight: 500,
              }}
            >
              never got around to.
            </span>
          </h2>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {FEATURES.map((f) => {
            const t = tintMap[f.tint];
            return (
              <div
                key={f.title}
                className="card p-8 flex gap-5 items-start"
                style={{ borderRadius: 28 }}
              >
                <div
                  className="flex-none w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{
                    background: t.bg,
                    color: t.fg,
                    border: `1px solid ${t.border}`,
                    borderRadius: 16,
                  }}
                  aria-hidden="true"
                >
                  {f.icon}
                </div>
                <div>
                  <h3
                    className="font-display text-[22px] font-semibold text-[color:var(--color-navy)]"
                    style={{ margin: 0, lineHeight: 1.2 }}
                  >
                    {f.title}
                  </h3>
                  <p className="mt-2 text-[15px] text-[color:var(--color-ink-soft)] leading-[1.55]">
                    {f.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

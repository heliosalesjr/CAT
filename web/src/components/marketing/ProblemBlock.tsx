const PAINS = [
  {
    title: "Recruiters drown in unranked applicants.",
    detail:
      "Legacy platforms flood inboxes with no meaningful filtering, and qualifying candidates becomes a manual slog.",
  },
  {
    title: "References come from the wrong people.",
    detail:
      "Outdated or misattributed references leave real safeguarding gaps — not just efficiency ones.",
  },
  {
    title: "Teachers apply into total silence.",
    detail:
      "Candidates hear nothing after applying, can’t articulate their “why,” and lose weeks to broken threads.",
  },
  {
    title: "The best-fit match rarely happens.",
    detail:
      "Placements chase salary and reputation instead of background, curriculum, and environmental fit.",
  },
];

export function ProblemBlock() {
  return (
    <section id="trust" className="pt-20 md:pt-24 pb-4">
      <div className="wrap">
        <div
          className="relative overflow-hidden"
          style={{
            background: "var(--color-navy)",
            borderRadius: 40,
          }}
        >
          {/* Soft glow */}
          <div
            aria-hidden="true"
            className="absolute -top-24 -right-16 w-[420px] h-[420px] rounded-full opacity-25 blur-3xl"
            style={{ background: "var(--color-teal)" }}
          />
          <div
            aria-hidden="true"
            className="absolute -bottom-32 -left-24 w-[440px] h-[440px] rounded-full opacity-15 blur-3xl"
            style={{ background: "var(--color-gold)" }}
          />

          <div className="relative grid gap-10 md:grid-cols-[1.1fr_1.6fr] p-8 sm:p-12 md:p-16">
            {/* Left: intro */}
            <div>
              <span className="eyebrow !text-white/60">The status quo</span>
              <h2
                className="mt-5 font-display font-semibold text-white"
                style={{
                  fontSize: "clamp(30px, 3.6vw, 44px)",
                  lineHeight: 1.15,
                  letterSpacing: "-0.015em",
                  margin: 0,
                }}
              >
                International recruitment{" "}
                <span
                  style={{
                    fontStyle: "italic",
                    color: "var(--color-gold)",
                    fontWeight: 500,
                  }}
                >
                  shouldn’t feel this broken.
                </span>
              </h2>
              <p className="mt-5 text-white/70 text-[15.5px] leading-[1.6] max-w-md">
                Search Associates, Schrole and ISS built the category, but the
                experience hasn’t moved in a decade. We took every pain point
                heads of school actually mentioned to us — and started there.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <span className="pill-gold">Safeguarding</span>
                <span
                  className="pill"
                  style={{
                    borderColor: "rgba(255,255,255,0.18)",
                    background: "transparent",
                    color: "#fff",
                  }}
                >
                  Time-to-hire
                </span>
                <span
                  className="pill"
                  style={{
                    borderColor: "rgba(255,255,255,0.18)",
                    background: "transparent",
                    color: "#fff",
                  }}
                >
                  Fit
                </span>
              </div>
            </div>

            {/* Right: arrow list */}
            <ul>
              {PAINS.map((p) => (
                <li key={p.title} className="arrow-item">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M5 12h14M13 6l6 6-6 6"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div>
                    <p className="text-white font-medium text-[18px] leading-snug">
                      {p.title}
                    </p>
                    <p className="text-white/60 text-[14px] leading-[1.55] mt-1">
                      {p.detail}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

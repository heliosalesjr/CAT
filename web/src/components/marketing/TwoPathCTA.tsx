export function TwoPathCTA() {
  return (
    <section className="py-16 md:py-24">
      <div className="wrap">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Teacher path */}
          <div
            id="teachers"
            className="relative overflow-hidden p-10 md:p-12 flex flex-col"
            style={{
              borderRadius: 40,
              background:
                "linear-gradient(160deg, #ffffff 0%, var(--color-cream) 100%)",
              border: "1px solid var(--color-line)",
              minHeight: 380,
            }}
          >
            <div
              aria-hidden="true"
              className="absolute -top-16 -right-10 w-56 h-56 rounded-full opacity-25 blur-3xl"
              style={{ background: "var(--color-gold)" }}
            />
            <span className="pill-gold self-start">For teachers</span>
            <h3
              className="mt-6 font-display font-semibold text-[color:var(--color-navy)]"
              style={{
                fontSize: "clamp(28px, 3.4vw, 40px)",
                lineHeight: 1.15,
                letterSpacing: "-0.02em",
                margin: 0,
              }}
            >
              Move abroad without moving alone.
            </h3>
            <p className="mt-4 text-[16px] text-[color:var(--color-ink-soft)] leading-[1.55] max-w-md">
              Free profile. Verified references. Applications that get answered.
              Premium boosts optional — never gatekeeping.
            </p>
            <div className="mt-auto pt-8 flex flex-wrap gap-3">
              <a href="#teacher-signup" className="btn btn-primary">
                Start your profile
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M5 12h14M13 6l6 6-6 6"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </a>
              <a href="#teacher-tour" className="btn btn-ghost">
                See the tour
              </a>
            </div>
          </div>

          {/* School path */}
          <div
            id="schools"
            className="relative overflow-hidden p-10 md:p-12 flex flex-col text-white"
            style={{
              borderRadius: 40,
              background:
                "linear-gradient(160deg, var(--color-navy) 0%, var(--color-navy-deep) 100%)",
              minHeight: 380,
            }}
          >
            <div
              aria-hidden="true"
              className="absolute -bottom-24 -left-16 w-72 h-72 rounded-full opacity-25 blur-3xl"
              style={{ background: "var(--color-teal)" }}
            />

            <span
              className="pill self-start"
              style={{
                background: "transparent",
                borderColor: "rgba(255,255,255,0.25)",
                color: "#fff",
              }}
            >
              For schools
            </span>
            <h3
              className="mt-6 font-display font-semibold text-white"
              style={{
                fontSize: "clamp(28px, 3.4vw, 40px)",
                lineHeight: 1.15,
                letterSpacing: "-0.02em",
                margin: 0,
              }}
            >
              Fill roles you actually want to hire for.
            </h3>
            <p className="mt-4 text-[16px] text-white/70 leading-[1.55] max-w-md">
              Plans scale by student enrollment. RBAC, ATS, and explainable
              matching built in. No per-post gouging.
            </p>
            <div className="mt-auto pt-8 flex flex-wrap gap-3">
              <a
                href="#book-demo"
                className="btn"
                style={{
                  background: "var(--color-gold)",
                  color: "var(--color-navy)",
                }}
              >
                Book a demo
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M5 12h14M13 6l6 6-6 6"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </a>
              <a href="#pricing" className="btn btn-ghost-white">
                See pricing
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

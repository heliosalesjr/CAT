import { HeroRotator } from "./HeroRotator";
import { MatchCard } from "./MatchCard";

export function Hero() {
  return (
    <section className="relative pt-16 md:pt-24 pb-24 md:pb-32 overflow-hidden">
      {/* Ambient background sheen */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(1000px 500px at 80% -10%, rgba(129,196,207,0.18), transparent 60%), radial-gradient(700px 400px at 10% 40%, rgba(241,187,76,0.10), transparent 60%)",
        }}
      />

      <div className="wrap relative grid gap-14 md:gap-16 lg:grid-cols-[1.15fr_1fr] items-start">
        {/* Left column */}
        <div className="pt-4">
          <div className="pill mb-8">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "var(--color-gold-deep)" }}
              aria-hidden="true"
            />
            <span>Now onboarding schools for the 2026–27 cycle</span>
          </div>

          <h1
            className="font-display font-semibold text-[color:var(--color-navy)]"
            style={{
              fontSize: "clamp(40px, 6.4vw, 68px)",
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              margin: 0,
            }}
          >
            Teach in{" "}
            <HeroRotator />
            <br />
            without the{" "}
            <span
              style={{
                fontStyle: "italic",
                fontWeight: 500,
                color: "var(--color-navy-soft)",
              }}
            >
              recruiter roulette.
            </span>
          </h1>

          <p
            className="mt-7 max-w-xl text-[17px] md:text-[18px] leading-[1.55] text-[color:var(--color-ink-soft)]"
          >
            Class Act Talent connects international schools with verified,
            safeguarded teachers — and nudges everyone to actually communicate.
            Better filtering for schools. Real feedback for teachers. AI that{" "}
            <span className="font-semibold text-[color:var(--color-navy)]">
              suggests
            </span>{" "}
            — humans decide.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <a href="#teacher-signup" className="btn btn-primary">
              Join as a teacher
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
            <a href="#schools" className="btn btn-ghost">
              For schools
            </a>
          </div>

          {/* Trust micro-line */}
          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center justify-center w-6 h-6 rounded-full"
                style={{ background: "var(--color-green-soft)" }}
                aria-hidden="true"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M5 12l4 4L19 7"
                    stroke="#2d6a45"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="text-[13.5px] text-[color:var(--color-ink-soft)]">
                Institutionally verified schools
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center justify-center w-6 h-6 rounded-full"
                style={{ background: "var(--color-teal-soft)" }}
                aria-hidden="true"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 2l2 5h5l-4 3.5 1.5 5-4.5-3-4.5 3 1.5-5-4-3.5h5l2-5z"
                    stroke="#1f5b66"
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="text-[13.5px] text-[color:var(--color-ink-soft)]">
                Reference-verified teachers
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center justify-center w-6 h-6 rounded-full"
                style={{ background: "var(--color-cream)" }}
                aria-hidden="true"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M4 4h16M4 12h16M4 20h10"
                    stroke="var(--color-gold-deep)"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <span className="text-[13.5px] text-[color:var(--color-ink-soft)]">
                Explainable rankings
              </span>
            </div>
          </div>
        </div>

        {/* Right column: match card */}
        <div className="relative lg:pt-2">
          <MatchCard />
        </div>
      </div>
    </section>
  );
}

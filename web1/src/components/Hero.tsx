import { Contours } from "./Contours";
import { Destination } from "./Destination";
import { HeroTerrain } from "./HeroTerrain";

const ASSURANCES = [
  "Institutionally verified schools",
  "Reference-verified teachers",
  "Explainable rankings",
];

export function Hero() {
  return (
    <section
      data-stage
      className="relative overflow-hidden"
      style={{ "--pan-x": "-140px", "--pan-y": "-60px", "--pan-s": "1.18" } as React.CSSProperties}
    >
      {/* The field the headline travels across. It is one map: the
          rotator moves it rather than swapping it, so the destinations
          read as places on the same world. */}
      <div className="terrain" aria-hidden="true">
        <HeroTerrain
          low={<Contours viewBox="0 0 1200 800" strokeWidth={1} levels={[0, 1, 2, 3]} />}
          mid={<Contours viewBox="0 0 1200 800" strokeWidth={1} levels={[4, 5, 6, 7, 8]} />}
          high={
            <Contours
              viewBox="0 0 1200 800"
              strokeWidth={1}
              levels={[9, 10, 11, 12]}
              highlight={[9]}
            />
          }
        />
      </div>

      {/* Paper lifts under the type so the linework never fights it. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          /* The lift is the paper coming up under the type. Written as
             a channel triplet so a variant can retheme it — a dark
             hero needs this glow to be navy, not cream. The fallback
             is the paper's own value, so the default is unchanged. */
          background:
            "radial-gradient(820px 520px at 14% 46%, rgb(var(--hero-lift, 250 248 243) / 0.97), rgb(var(--hero-lift, 250 248 243) / 0.72) 46%, rgb(var(--hero-lift, 250 248 243) / 0) 74%)",
        }}
      />

      <div className="wrap relative py-12 md:py-16 lg:py-20">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="h-px w-7 shrink-0"
            style={{ background: "var(--color-gold-deep)" }}
          />
          <span className="label">
            Now onboarding schools for the 2026–27 cycle
          </span>
        </div>

        <h1 className="display mt-8 max-w-[16ch]">
          Teach in
          <Destination />
          without the recruiter roulette.
        </h1>

        <p className="lede mt-7 max-w-[30em]">
          Class Act Talent connects international schools with verified,
          safeguarded teachers — and nudges everyone to actually communicate.
          Better filtering for schools. Real feedback for teachers. AI that{" "}
          <em className="font-semibold not-italic text-[color:var(--color-navy)]">
            suggests
          </em>{" "}
          — humans decide.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <a href="#teacher-signup" className="btn btn-gold">
            Join as a teacher
          </a>
          <a href="#schools" className="btn btn-outline">
            For schools
          </a>
        </div>

        <ul className="mt-10 flex flex-wrap gap-x-10 gap-y-3 border-t border-[color:var(--color-rule)] pt-5">
          {ASSURANCES.map((a) => (
            <li key={a} className="flex items-center gap-2.5">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M4 12.5 9.5 18 20 5"
                  stroke="var(--color-green)"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="label !tracking-[0.13em] !text-[color:var(--color-navy-2)]">
                {a}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

import { Contours } from "./Contours";

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
    <section
      id="trust"
      className="on-navy relative overflow-hidden py-24 md:py-32"
    >
      <Contours
        className="opacity-80"
        viewBox="120 100 940 620"
        strokeWidth={1}
        levels={[1, 4, 7, 10]}
      />

      <div className="wrap relative">
        <div>
          <span className="label label-gold">The status quo</span>
          <h2 className="display-md mt-6 max-w-[17em]">
            International recruitment
            <br />
            <span style={{ color: "var(--color-teal)" }}>
              shouldn’t feel this broken.
            </span>
          </h2>
        </div>

        <p className="body mt-7 max-w-[38em]">
          Search Associates, Schrole and ISS built the category, but the
          experience hasn’t moved in a decade. We took every pain point heads of
          school actually mentioned to us — and started there.
        </p>

        <div className="mt-8 flex flex-wrap gap-2">
          <span className="key key-gold">Safeguarding</span>
          <span className="key">Time-to-hire</span>
          <span className="key">Fit</span>
        </div>

        <ol className="mt-16 grid gap-x-16 gap-y-12 md:grid-cols-2">
          {PAINS.map((p, i) => (
            <li
              key={p.title}
              className="border-t border-[color:var(--color-rule)] pt-6"
            >
              <span className="readout !text-[color:var(--color-gold)]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="title mt-4">{p.title}</h3>
              <p className="body mt-3 max-w-[34em]">
                {p.detail}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

import { Contours } from "./Contours";

const FEATURES = [
  {
    title: "Explainable matches, always.",
    desc: "Every AI suggestion is shown with the reasons behind it. Schools can disable ranking with one toggle and browse candidates unordered.",
    icon: (
      <path
        d="M12 2l2.5 6.5L21 10l-5 4 1.5 7L12 17.5 6.5 21 8 14l-5-4 6.5-1.5L12 2z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    ),
  },
  {
    title: "No more silence.",
    desc: "The platform nudges schools to give real feedback on stalled applications, and teachers always know where they stand in the pipeline.",
    icon: (
      <path
        d="M21 11.5a8.5 8.5 0 01-12.9 7.3L3 21l2.2-5A8.5 8.5 0 1121 11.5z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    ),
  },
  {
    title: "Roles that reflect reality.",
    desc: "HR, principal, coordinator — each with the right permissions from day one. RBAC baked into the schema, not layered as an afterthought.",
    icon: (
      <path
        d="M12 12a4 4 0 100-8 4 4 0 000 8zM4 20a8 8 0 1116 0"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    ),
  },
  {
    title: "Documents you can trust.",
    desc: "Sensitive uploads live in an isolated bucket with signed URLs and access logs. Deletion is a first-class feature, not a support ticket.",
    icon: (
      <>
        <path
          d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M9 12l2 2 4-4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    ),
  },
];

export function FeatureGrid() {
  return (
    <section className="relative overflow-hidden py-20 md:py-28">
      {/* The legend sits on the map, the way it does on a printed sheet. */}
      <Contours
        className="opacity-60"
        viewBox="80 160 900 560"
        strokeWidth={1}
        levels={[0, 3, 6, 9, 12]}
      />

      <div className="wrap relative">
        <div className="mb-12">
          <span className="label label-teal">What we built differently</span>
          <h2 className="display-md mt-6 max-w-[15em]">
            The infrastructure the category{" "}
            <span style={{ color: "var(--color-teal-ink)" }}>
              never got around to.
            </span>
          </h2>
        </div>

        <div className="legend">
          {/* Trimmed corners, as on a map sheet. */}
          <span className="legend-corner left-0 top-0 border-l border-t" aria-hidden="true" />
          <span className="legend-corner right-0 top-0 border-r border-t" aria-hidden="true" />
          <span className="legend-corner bottom-0 left-0 border-b border-l" aria-hidden="true" />
          <span className="legend-corner bottom-0 right-0 border-b border-r" aria-hidden="true" />

          <div className="flex items-center justify-between gap-6 border-b border-[color:var(--color-rule)] px-7 py-4 md:px-9">
            <span className="label label-teal">Legend</span>
            <span className="readout">
              {FEATURES.length} symbols · sheet 01
            </span>
          </div>

          <div className="grid gap-px bg-[color:var(--color-rule)] sm:grid-cols-2">
            {FEATURES.map((f, i) => (
              <article key={f.title} className="legend-cell">
                <span className="legend-symbol" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
                    {f.icon}
                  </svg>
                </span>

                <div className="min-w-0">
                  <span className="readout !text-[color:var(--color-teal-ink)]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="title mt-2.5">{f.title}</h3>
                  <p className="body mt-3 !text-[color:var(--color-navy-3)]">
                    {f.desc}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

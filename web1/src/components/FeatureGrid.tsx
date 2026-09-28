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
    <section className="wrap py-20 md:py-28">
      <div className="mb-14">
        <span className="label">What we built differently</span>
        <h2 className="display-md mt-6 max-w-[20em]">
          The infrastructure the category{" "}
          <span style={{ color: "var(--color-navy-3)" }}>
            never got around to.
          </span>
        </h2>
      </div>

      <div className="grid gap-x-16 gap-y-12 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="flex gap-5 border-t border-[color:var(--color-rule)] pt-6"
          >
            <span
              className="mt-0.5 shrink-0"
              style={{ color: "var(--color-teal-ink)" }}
              aria-hidden="true"
            >
              <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
                {f.icon}
              </svg>
            </span>
            <div>
              <h3 className="title">{f.title}</h3>
              <p className="body mt-3 max-w-[32em] !text-[color:var(--color-navy-3)]">
                {f.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

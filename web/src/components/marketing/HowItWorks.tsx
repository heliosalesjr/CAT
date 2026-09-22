import Image from "next/image";

const CARDS = [
  {
    tag: "For teachers",
    tagClass: "pill-teal",
    title: "Get seen for who you are.",
    desc: "Build a rich profile with intro video, curricula taught, and verified references — then let matches come to you.",
    steps: ["Profile", "Preferences", "Verified references", "Matches"],
    image:
      "https://images.unsplash.com/photo-1544717305-2782549b5136?w=900&h=700&fit=crop&q=80",
    imageAlt: "Teacher smiling in a classroom",
  },
  {
    tag: "For schools",
    tagClass: "pill-green",
    title: "Filter smart, decide human.",
    desc: "Multi-criteria search across the whole candidate pool, ranked with explainability. Ranking is optional — you can always turn it off.",
    steps: ["Post", "Filter", "Explainable rank", "ATS pipeline"],
    image:
      "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=900&h=700&fit=crop&q=80",
    imageAlt: "School hallway with plants",
  },
  {
    tag: "Verified & safeguarded",
    tagClass: "pill-gold",
    title: "Built for real safeguarding.",
    desc: "Documents live in isolated storage with signed URLs and audit logs. References are traced to real supervisors — not distant friends.",
    steps: ["Dedicated bucket", "Signed URLs", "Access log", "Retention"],
    image:
      "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=900&h=700&fit=crop&q=80",
    imageAlt: "Open books on a desk",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="py-24 md:py-28">
      <div className="wrap">
        <div className="grid md:grid-cols-[1fr_1fr] items-end gap-8 mb-14">
          <div>
            <span className="eyebrow">How it works</span>
            <h2
              className="mt-4 font-display font-semibold"
              style={{
                fontSize: "clamp(30px, 4vw, 48px)",
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
                margin: 0,
              }}
            >
              Three sides.{" "}
              <span
                style={{
                  fontStyle: "italic",
                  color: "var(--color-gold-deep)",
                  fontWeight: 500,
                }}
              >
                One honest process.
              </span>
            </h2>
          </div>
          <p className="text-[16px] md:text-[17px] text-[color:var(--color-ink-soft)] leading-[1.55] max-w-md md:justify-self-end">
            Teachers, schools, and the safeguarding layer that quietly holds
            everything together — treated as first-class from day one, not
            bolted on later.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {CARDS.map((c) => (
            <article
              key={c.title}
              className="card overflow-hidden flex flex-col group"
              style={{ borderRadius: 32 }}
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden">
                <Image
                  src={c.image}
                  alt={c.imageAlt}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <span
                  className={`${c.tagClass} absolute top-4 left-4`}
                  style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.6)" }}
                >
                  {c.tag}
                </span>
              </div>

              <div className="p-7 flex flex-col flex-1">
                <h3
                  className="font-display text-[22px] font-semibold text-[color:var(--color-navy)]"
                  style={{ margin: 0, lineHeight: 1.2 }}
                >
                  {c.title}
                </h3>
                <p className="mt-3 text-[15px] text-[color:var(--color-ink-soft)] leading-[1.55]">
                  {c.desc}
                </p>

                <ol className="mt-6 space-y-2.5">
                  {c.steps.map((s, i) => (
                    <li
                      key={s}
                      className="flex items-center gap-3 text-[13.5px] text-[color:var(--color-ink)] font-medium"
                    >
                      <span
                        className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-semibold"
                        style={{
                          background: "var(--color-cream)",
                          color: "var(--color-navy)",
                          border: "1px solid var(--color-line)",
                        }}
                      >
                        {i + 1}
                      </span>
                      {s}
                    </li>
                  ))}
                </ol>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

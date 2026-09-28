import Image from "next/image";

const CARDS = [
  {
    tag: "For teachers",
    title: "Get seen for who you are.",
    desc: "Build a rich profile with intro video, curricula taught, and verified references — then let matches come to you.",
    steps: ["Profile", "Preferences", "Verified references", "Matches"],
    image:
      "https://images.unsplash.com/photo-1544717305-2782549b5136?w=900&h=700&fit=crop&q=80",
    imageAlt: "Teacher smiling in a classroom",
  },
  {
    tag: "For schools",
    title: "Filter smart, decide human.",
    desc: "Multi-criteria search across the whole candidate pool, ranked with explainability. Ranking is optional — you can always turn it off.",
    steps: ["Post", "Filter", "Explainable rank", "ATS pipeline"],
    image:
      "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=900&h=700&fit=crop&q=80",
    imageAlt: "School hallway with plants",
  },
  {
    tag: "Verified & safeguarded",
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
    <section id="how" className="wrap py-20 md:py-28">
      <div className="mb-16 grid items-end gap-8 md:grid-cols-[1.1fr_1fr]">
        <div>
          <span className="label">How it works</span>
          <h2 className="display-md mt-6 max-w-[17em]">
            Three sides.{" "}
            <span style={{ color: "var(--color-teal-ink)" }}>
              One honest process.
            </span>
          </h2>
        </div>
        <p className="body md:max-w-sm md:justify-self-end">
          Teachers, schools, and the safeguarding layer that quietly holds
          everything together — treated as first-class from day one, not bolted
          on later.
        </p>
      </div>

      <div className="grid gap-x-10 gap-y-14 md:grid-cols-3">
        {CARDS.map((c, i) => (
          <article key={c.title} className="group flex flex-col">
            <div className="plate relative aspect-[5/4] w-full">
              <Image
                src={c.image}
                alt={c.imageAlt}
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.04]"
              />
              <span
                className="readout absolute bottom-3 right-3 z-[3]"
                style={{ color: "rgba(250,248,243,0.75)" }}
              >
                Plate {String(i + 1).padStart(2, "0")}
              </span>
            </div>

            <span className="key key-gold mt-6 self-start">{c.tag}</span>
            <h3 className="title mt-5">{c.title}</h3>
            <p className="body mt-3 !text-[color:var(--color-navy-3)]">{c.desc}</p>

            <ol className="mt-7 border-t border-[color:var(--color-rule)]">
              {c.steps.map((s, si) => (
                <li
                  key={s}
                  className="flex items-center gap-4 border-b border-[color:var(--color-rule)] py-2.5"
                >
                  <span className="readout w-3 shrink-0">{si + 1}</span>
                  <span
                    style={{
                      fontVariationSettings: '"wdth" 86',
                      fontWeight: 500,
                      fontSize: 12.5,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "var(--color-navy-2)",
                    }}
                  >
                    {s}
                  </span>
                </li>
              ))}
            </ol>
          </article>
        ))}
      </div>
    </section>
  );
}

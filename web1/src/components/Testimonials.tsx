import Image from "next/image";

const QUOTES = [
  {
    quote:
      "I finally saw the applicants I actually needed to see. Not the loudest — the right ones.",
    name: "Dr. Naledi Mensah",
    role: "Head of Secondary · Accra International",
    avatar:
      "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop&crop=faces&q=80",
    station: "GH · 05",
  },
  {
    quote:
      "The first platform that told me why I got rejected. It stung less than the silence used to.",
    name: "James Whitmore",
    role: "IB DP English · relocating to Shanghai",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=faces&q=80",
    station: "CN · 12",
  },
  {
    quote:
      "References that actually meant something. Our safeguarding officer sleeps better.",
    name: "Elena Ruiz",
    role: "HR Director · Barcelona Global",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=faces&q=80",
    station: "ES · 21",
  },
];

export function Testimonials() {
  return (
    <section className="wrap py-20 md:py-28">
      <div className="mb-14">
        <span className="label">In their words</span>
        <h2 className="display-md mt-6 max-w-[17em]">
          The people using it,{" "}
          <span style={{ color: "var(--color-teal-ink)" }}>on both sides.</span>
        </h2>
      </div>

      <div className="grid gap-x-14 gap-y-12 md:grid-cols-3">
        {QUOTES.map((q) => (
          <figure
            key={q.name}
            className="flex flex-col border-t border-[color:var(--color-rule)] pt-6"
          >
            <div className="flex items-center justify-between">
              <span
                aria-hidden="true"
                className="block h-px w-8"
                style={{ background: "var(--color-gold-deep)" }}
              />
              <span className="readout">{q.station}</span>
            </div>

            <blockquote
              className="mt-7 flex-1"
              style={{
                fontVariationSettings: '"wdth" 100',
                fontWeight: 500,
                fontSize: 18,
                lineHeight: 1.45,
                color: "var(--color-navy)",
              }}
            >
              “{q.quote}”
            </blockquote>

            <figcaption className="mt-8 flex items-center gap-4">
              <span className="plate relative block h-10 w-10 shrink-0">
                <Image
                  src={q.avatar}
                  alt={q.name}
                  width={40}
                  height={40}
                  className="h-full w-full object-cover"
                />
              </span>
              <div>
                <div
                  style={{
                    fontVariationSettings: '"wdth" 90',
                    fontWeight: 600,
                    fontSize: 13,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--color-navy)",
                  }}
                >
                  {q.name}
                </div>
                <div className="mt-0.5 text-[12.5px] text-[color:var(--color-navy-3)]">
                  {q.role}
                </div>
              </div>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

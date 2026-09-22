import Image from "next/image";

const QUOTES = [
  {
    quote:
      "I finally saw the applicants I actually needed to see. Not the loudest — the right ones.",
    name: "Dr. Naledi Mensah",
    role: "Head of Secondary · Accra International",
    avatar:
      "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop&crop=faces&q=80",
    tint: "teal",
  },
  {
    quote:
      "The first platform that told me why I got rejected. It stung less than the silence used to.",
    name: "James Whitmore",
    role: "IB DP English · relocating to Shanghai",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=faces&q=80",
    tint: "gold",
  },
  {
    quote:
      "References that actually meant something. Our safeguarding officer sleeps better.",
    name: "Elena Ruiz",
    role: "HR Director · Barcelona Global",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=faces&q=80",
    tint: "green",
  },
];

const dot = {
  gold: "var(--color-gold-deep)",
  teal: "#1f5b66",
  green: "#2d6a45",
};

export function Testimonials() {
  return (
    <section className="py-24 md:py-28">
      <div className="wrap">
        <div className="max-w-2xl mb-14">
          <span className="eyebrow">In their words</span>
          <h2
            className="mt-4 font-display font-semibold text-[color:var(--color-navy)]"
            style={{
              fontSize: "clamp(28px, 3.6vw, 42px)",
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
              margin: 0,
            }}
          >
            The people using it,{" "}
            <span
              style={{
                fontStyle: "italic",
                color: "var(--color-gold-deep)",
                fontWeight: 500,
              }}
            >
              on both sides.
            </span>
          </h2>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {QUOTES.map((q) => (
            <figure
              key={q.name}
              className="card p-8 flex flex-col justify-between"
              style={{ borderRadius: 28, minHeight: 320 }}
            >
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
                style={{ color: dot[q.tint as keyof typeof dot], opacity: 0.7 }}
              >
                <path
                  d="M7 8h4v4H7v4H3V8a4 4 0 014-4v4zM17 8h4v4h-4v4h-4V8a4 4 0 014-4v4z"
                  fill="currentColor"
                />
              </svg>

              <blockquote className="mt-6 font-display text-[20px] leading-[1.4] text-[color:var(--color-navy)]">
                “{q.quote}”
              </blockquote>

              <figcaption className="mt-6 pt-6 border-t border-[color:var(--color-line)] flex items-center gap-3">
                <Image
                  src={q.avatar}
                  alt={q.name}
                  width={44}
                  height={44}
                  className="rounded-full object-cover"
                />
                <div>
                  <div className="text-[14px] font-semibold text-[color:var(--color-navy)]">
                    {q.name}
                  </div>
                  <div className="text-[12.5px] text-[color:var(--color-ink-soft)]">
                    {q.role}
                  </div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

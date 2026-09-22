import Image from "next/image";

/**
 * Illustrative match card shown in the hero.
 * Communicates the core promise: verified teacher × school pairing,
 * explainable AI score, safeguarding badges.
 */
export function MatchCard() {
  return (
    <div className="relative">
      {/* Floating accents */}
      <div
        aria-hidden="true"
        className="absolute -top-6 -right-6 w-32 h-32 rounded-full opacity-40 blur-2xl"
        style={{ background: "var(--color-gold)" }}
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full opacity-30 blur-2xl"
        style={{ background: "var(--color-teal)" }}
      />

      {/* Main card */}
      <div
        className="card relative p-6 md:p-7"
        style={{ borderRadius: 32 }}
      >
        {/* Header row: role + AI badge */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <span className="pill" style={{ paddingBlock: 4 }}>
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: "var(--color-green)" }}
                aria-hidden="true"
              />
              New match
            </span>
          </div>
          <span className="pill-gold">Match 94</span>
        </div>

        {/* Teacher block */}
        <div className="flex items-start gap-4">
          <div className="relative flex-none">
            <Image
              src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop&crop=faces&q=80"
              alt="Amelia Chen"
              width={72}
              height={72}
              className="rounded-2xl object-cover"
              style={{ borderRadius: 20 }}
            />
            {/* Verified check */}
            <span
              aria-hidden="true"
              className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full flex items-center justify-center"
              style={{
                background: "var(--color-green)",
                boxShadow: "0 0 0 2.5px #fff",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 12l4 4L19 7"
                  stroke="#fff"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3
                className="font-display text-[19px] font-semibold leading-tight text-[color:var(--color-navy)]"
                style={{ margin: 0 }}
              >
                Amelia Chen
              </h3>
              <span className="pill-teal">IB · MYP</span>
            </div>
            <p className="text-[13.5px] text-[color:var(--color-ink-soft)] leading-snug">
              Middle-years Science · 8 yrs · Cambridge, UK →{" "}
              <span className="font-semibold text-[color:var(--color-navy)]">
                seeking Seoul
              </span>
            </p>

            <div className="flex flex-wrap gap-1.5 mt-3">
              <span className="pill" style={{ padding: "3px 9px", fontSize: 11.5 }}>
                Passport ✓
              </span>
              <span className="pill" style={{ padding: "3px 9px", fontSize: 11.5 }}>
                DBS ✓
              </span>
              <span className="pill" style={{ padding: "3px 9px", fontSize: 11.5 }}>
                3 refs verified
              </span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div
          className="my-5 flex items-center gap-3"
          aria-hidden="true"
        >
          <div className="flex-1 h-px bg-[color:var(--color-line)]" />
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center border border-[color:var(--color-line)] bg-[color:var(--color-canvas)]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 5v14M6 12l6 6 6-6"
                stroke="var(--color-navy)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="flex-1 h-px bg-[color:var(--color-line)]" />
        </div>

        {/* School block */}
        <div className="flex items-start gap-4">
          <div className="flex-none">
            <div
              className="w-[72px] h-[72px] flex items-center justify-center"
              style={{
                borderRadius: 20,
                background:
                  "linear-gradient(135deg, #1f3d64 0%, #19304d 100%)",
              }}
            >
              <span className="font-display text-white font-semibold text-[22px] leading-none">
                YIS
              </span>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <h3
              className="font-display text-[19px] font-semibold leading-tight text-[color:var(--color-navy)] mb-1"
              style={{ margin: 0 }}
            >
              Yeongdong International School
            </h3>
            <p className="text-[13.5px] text-[color:var(--color-ink-soft)] leading-snug">
              Seoul, South Korea · 640 students · MYP + DP · Institutionally verified
            </p>

            <div className="flex flex-wrap gap-1.5 mt-3">
              <span className="pill-green">Fit: curriculum</span>
              <span className="pill-teal">Fit: climate</span>
            </div>
          </div>
        </div>

        {/* Explainability strip */}
        <div
          className="mt-6 p-4 rounded-2xl"
          style={{
            background: "var(--color-cream)",
            border: "1px solid var(--color-line)",
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 2l2.5 6.5L21 10l-5 4 1.5 7L12 17.5 6.5 21 8 14l-5-4 6.5-1.5L12 2z"
                stroke="var(--color-gold-deep)"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
            </svg>
            <span className="eyebrow !text-[10.5px]">Why this match</span>
          </div>
          <p className="text-[13px] text-[color:var(--color-ink-soft)] leading-snug">
            IB MYP experience, climate preference matches Seoul, and 2 of her
            references are already in our verified network.
          </p>
        </div>

        {/* Footer disclaimer */}
        <p className="mt-4 text-[11.5px] text-[color:var(--color-ink-mute)] leading-snug">
          AI suggests. A human always decides.
        </p>
      </div>
    </div>
  );
}

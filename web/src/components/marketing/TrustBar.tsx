const MARKETS = [
  "Seoul · KR",
  "Shanghai · CN",
  "Beijing · CN",
  "Bogotá · CO",
  "Accra · GH",
  "Barcelona · ES",
  "Amsterdam · NL",
  "Ho Chi Minh · VN",
  "Berlin · DE",
  "Dubai · AE",
  "Singapore · SG",
  "Lisbon · PT",
];

export function TrustBar() {
  const doubled = [...MARKETS, ...MARKETS];

  return (
    <section className="py-12 md:py-14 border-y border-[color:var(--color-line)]/70 bg-[color:var(--color-canvas)]">
      <div className="wrap">
        <div className="flex items-center gap-3 mb-6">
          <span
            className="w-8 h-px"
            style={{ background: "var(--color-ink-mute)", opacity: 0.4 }}
            aria-hidden="true"
          />
          <span className="eyebrow">Placing teachers in</span>
        </div>
      </div>

      <div
        className="relative overflow-hidden"
        style={{
          maskImage:
            "linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)",
          WebkitMaskImage:
            "linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)",
        }}
      >
        <div className="marquee-track py-2">
          {doubled.map((m, i) => (
            <div
              key={`${m}-${i}`}
              className="flex items-center gap-3 text-[color:var(--color-ink-mute)]"
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: "var(--color-ink-mute)", opacity: 0.5 }}
                aria-hidden="true"
              />
              <span className="text-[15px] font-medium tracking-wide whitespace-nowrap">
                {m}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

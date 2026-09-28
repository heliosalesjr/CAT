const MARKETS = [
  "Seoul · KR", "Shanghai · CN", "Beijing · CN", "Bogotá · CO",
  "Accra · GH", "Barcelona · ES", "Amsterdam · NL", "Ho Chi Minh · VN",
  "Berlin · DE", "Dubai · AE", "Singapore · SG", "Lisbon · PT",
];

export function TrustBar() {
  const doubled = [...MARKETS, ...MARKETS];

  return (
    <section className="border-y border-[color:var(--color-rule)] py-6">
      <div className="wrap mb-4 flex items-center gap-3">
        <span
          aria-hidden="true"
          className="h-px w-6"
          style={{ background: "var(--color-teal)" }}
        />
        <span className="label">Placing teachers in</span>
      </div>

      <div
        className="relative overflow-hidden"
        style={{
          maskImage:
            "linear-gradient(90deg, transparent, #000 7%, #000 93%, transparent)",
          WebkitMaskImage:
            "linear-gradient(90deg, transparent, #000 7%, #000 93%, transparent)",
        }}
      >
        <div className="marquee-track">
          {doubled.map((m, i) => (
            <span key={`${m}-${i}`} className="flex items-center gap-3 whitespace-nowrap">
              <span
                aria-hidden="true"
                className="h-[3px] w-[3px] rotate-45"
                style={{ background: "var(--color-teal-ink)" }}
              />
              <span
                style={{
                  fontVariationSettings: '"wdth" 80',
                  fontWeight: 500,
                  fontSize: 13,
                  letterSpacing: "0.17em",
                  textTransform: "uppercase",
                  color: "var(--color-navy-3)",
                }}
              >
                {m}
              </span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

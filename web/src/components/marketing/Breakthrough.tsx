import Image from "next/image";

export function Breakthrough() {
  return (
    <section className="pt-10 pb-2">
      <div className="wrap">
        <div
          className="relative overflow-hidden"
          style={{ borderRadius: 48 }}
        >
          <div className="relative aspect-[16/7] w-full">
            <Image
              src="https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1600&h=700&fit=crop&q=80"
              alt="Mountain valley at sunrise"
              fill
              sizes="(max-width: 1200px) 100vw, 1200px"
              className="object-cover"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, rgba(25,48,77,0.05) 0%, rgba(25,48,77,0.25) 100%)",
              }}
            />
          </div>

          <div className="absolute inset-x-0 bottom-0 p-8 md:p-12">
            <div className="max-w-2xl">
              <span className="eyebrow !text-white/70">
                Manifesto · 01
              </span>
              <p
                className="mt-4 font-display font-medium text-white"
                style={{
                  fontSize: "clamp(22px, 2.8vw, 34px)",
                  lineHeight: 1.25,
                  letterSpacing: "-0.01em",
                }}
              >
                A teacher moving countries deserves more than a spreadsheet.
                A school entrusting its students deserves more than a résumé.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

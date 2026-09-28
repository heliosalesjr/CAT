import { Contours } from "./Contours";
import { Wordmark } from "./Wordmark";

const columns = [
  {
    title: "For teachers",
    links: [
      { label: "Browse jobs", href: "#" },
      { label: "Create profile", href: "#" },
      { label: "Verification", href: "#" },
      { label: "Interview toolkit", href: "#" },
    ],
  },
  {
    title: "For schools",
    links: [
      { label: "Post a role", href: "#" },
      { label: "Candidate search", href: "#" },
      { label: "ATS pipeline", href: "#" },
      { label: "Pricing", href: "#" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "#" },
      { label: "Manifesto", href: "#" },
      { label: "Careers", href: "#" },
      { label: "Press kit", href: "#" },
    ],
  },
  {
    title: "Trust",
    links: [
      { label: "Safeguarding", href: "#" },
      { label: "Data & privacy", href: "#" },
      { label: "Delete my data", href: "#" },
      { label: "Terms", href: "#" },
    ],
  },
];

export function Footer() {
  return (
    <footer
      className="relative mt-auto overflow-hidden"
      style={
        {
          background: "var(--color-navy)",
          "--contour": "#27436a",
        } as React.CSSProperties
      }
    >
      <Contours
        className="opacity-70"
        viewBox="0 460 1200 340"
        strokeWidth={1}
        levels={[0, 1, 2, 3, 4]}
        preserveAspectRatio="none"
      />

      <div className="wrap relative py-16 md:py-20">
        <div className="grid items-start gap-14 md:grid-cols-[1.2fr_2fr]">
          <div>
            <span style={{ display: "block" }}>
              <Wordmark size="lg" tone="paper" />
            </span>
            <p
              className="mt-7 max-w-sm text-[15px] leading-[1.65]"
              style={{ color: "rgba(250,248,243,0.62)" }}
            >
              Ethical recruitment for international schools. A verified home for
              teachers who want to be seen for who they are — not just what they
              teach.
            </p>

            <form className="mt-9 max-w-md">
              <label
                htmlFor="newsletter"
                className="label mb-3 block"
                style={{ color: "rgba(250,248,243,0.55)" }}
              >
                The Staff Room · Monthly newsletter
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  id="newsletter"
                  type="email"
                  placeholder="you@school.edu"
                  className="field-input"
                  style={{
                    background: "rgba(250,248,243,0.06)",
                    borderColor: "rgba(250,248,243,0.2)",
                    color: "var(--color-paper)",
                  }}
                />
                <button type="submit" className="btn btn-gold">
                  Subscribe
                </button>
              </div>
            </form>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-4">
            {columns.map((col) => (
              <nav key={col.title}>
                <h4
                  className="label mb-5"
                  style={{ color: "rgba(250,248,243,0.85)" }}
                >
                  {col.title}
                </h4>
                <ul className="space-y-3">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <a
                        href={l.href}
                        className="link text-[14px]"
                        style={{ color: "rgba(250,248,243,0.62)" }}
                      >
                        {l.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <hr
          className="my-12 border-0"
          style={{ height: 1, background: "rgba(250,248,243,0.14)" }}
        />

        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div
            className="readout flex flex-wrap items-center gap-x-4 gap-y-1"
            style={{ color: "rgba(250,248,243,0.5)" }}
          >
            <span>© 2026 Class Act Talent Ltd.</span>
            <span aria-hidden="true">·</span>
            <span>Ethical Recruitment. Verified Trust.</span>
          </div>

          <div
            className="readout flex flex-wrap items-center gap-x-3 gap-y-1"
            style={{ color: "rgba(250,248,243,0.5)" }}
          >
            <span style={{ color: "var(--color-gold)" }}>Placing in</span>
            <span>Seoul</span>
            <span aria-hidden="true">·</span>
            <span>Shanghai</span>
            <span aria-hidden="true">·</span>
            <span>Bogotá</span>
            <span aria-hidden="true">·</span>
            <span>Accra</span>
            <span aria-hidden="true">·</span>
            <span>+34 more</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

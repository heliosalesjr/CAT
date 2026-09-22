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
    <footer className="bg-[color:var(--color-navy)] text-white mt-[80px]">
      <div className="wrap py-[80px]">
        <div className="grid gap-14 md:grid-cols-[1.3fr_2fr] items-start">
          <div>
            <Wordmark color="white" size="lg" />
            <p className="mt-6 max-w-sm text-[15px] text-white/70 leading-[1.6]">
              Ethical recruitment for international schools. A verified home for
              teachers who want to be seen for who they are — not just what they
              teach.
            </p>

            <form className="mt-8 max-w-md">
              <label
                htmlFor="newsletter"
                className="eyebrow !text-white/60 block mb-3"
              >
                The Staff Room · Monthly newsletter
              </label>
              <div className="flex gap-2 flex-col sm:flex-row">
                <input
                  id="newsletter"
                  type="email"
                  placeholder="you@school.edu"
                  className="email-input"
                />
                <button type="submit" className="btn btn-primary">
                  Subscribe
                </button>
              </div>
            </form>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-10">
            {columns.map((col) => (
              <div key={col.title}>
                <h4 className="text-white text-[13px] font-semibold uppercase tracking-[0.18em] font-sans mb-5">
                  {col.title}
                </h4>
                <ul className="space-y-3">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <a
                        href={l.href}
                        className="text-[14px] text-white/70 hover:text-white transition-colors"
                      >
                        {l.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <hr className="my-12 border-white/10" />

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-5 text-[13px] text-white/60">
            <span>© 2026 Class Act Talent Ltd.</span>
            <span aria-hidden="true">·</span>
            <span>Ethical Recruitment. Verified Trust.</span>
          </div>

          <div className="flex items-center gap-4 text-white/60 text-[13px]">
            <span className="eyebrow !text-white/50">Placing in</span>
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

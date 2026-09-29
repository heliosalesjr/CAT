import Link from "next/link";

type Section = { heading: string; body: string[] };

/**
 * Shared shell for the legal pages. They exist because the footer links
 * to them: a link that 404s is a dead link, which B9 rules out.
 */
export function LegalPage({
  title,
  updated,
  intro,
  sections,
}: {
  title: string;
  updated: string;
  intro: string;
  sections: Section[];
}) {
  return (
    <main id="main" className="flex-1">
      <div className="shell py-24">
        <Link href="/" className="footer-link text-sm">
          Back to the homepage
        </Link>

        <h1 className="mt-8 max-w-[680px] text-4xl font-semibold md:text-5xl">
          {title}
        </h1>
        <p className="mt-4 text-sm text-[color:var(--color-mute)]">
          Last updated {updated}
        </p>
        <p className="mt-6 max-w-[680px] text-lg text-[color:var(--color-ink-3)]">
          {intro}
        </p>

        <div className="mt-12 max-w-[680px]">
          {sections.map((s) => (
            <section
              key={s.heading}
              className="border-t border-[color:var(--color-line)] py-8"
            >
              <h2 className="text-xl font-semibold">{s.heading}</h2>
              {s.body.map((para, i) => (
                <p
                  key={i}
                  className="mt-3 text-base text-[color:var(--color-ink-3)]"
                >
                  {para}
                </p>
              ))}
            </section>
          ))}
        </div>

        <p className="mt-8 max-w-[680px] text-base text-[color:var(--color-ink-3)]">
          Questions about any of this go to{" "}
          <a href="mailto:privacy@classacttalent.com" className="footer-link underline">
            privacy@classacttalent.com
          </a>
          .
        </p>
      </div>
    </main>
  );
}

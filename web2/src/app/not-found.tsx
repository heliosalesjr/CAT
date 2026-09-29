import Link from "next/link";

export const metadata = { title: "Page not found — Class Act Talent" };

/* B10: a branded 404 with a way back. */
export default function NotFound() {
  return (
    <main id="main" className="flex flex-1 items-center">
      <div className="shell py-24">
        <p className="eyebrow">Error 404</p>
        <h1 className="mt-4 max-w-[680px] text-4xl font-semibold md:text-5xl">
          That page is not here.
        </h1>
        <p className="mt-4 max-w-[680px] text-lg text-[color:var(--color-ink-3)]">
          The link may be out of date, or the page may have moved while we were
          building the rest of the site.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/" className="btn btn-gold">
            Back to the homepage
          </Link>
          <a
            href="mailto:hello@classacttalent.com"
            className="btn btn-outline"
          >
            Tell us what broke
          </a>
        </div>
      </div>
    </main>
  );
}

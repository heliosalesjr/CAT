"use client";

import Link from "next/link";
import { PanelButton, type PanelId } from "./panels";

const PRODUCT: { label: string; id: PanelId }[] = [
  { label: "How it works", id: "how" },
  { label: "Where we hire", id: "where" },
  { label: "Questions", id: "questions" },
];

const COLUMNS = [
  {
    title: "Legal",
    links: [
      { label: "Privacy policy", href: "/privacy" },
      { label: "Terms of service", href: "/terms" },
      { label: "Delete my data", href: "/privacy#deletion" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-[color:var(--color-line)] py-12">
      <div className="shell">
        <div className="grid gap-8 md:grid-cols-[1fr_auto_auto] md:gap-16">
          <div>
            <p className="text-sm font-semibold text-[color:var(--color-ink)]">
              Class Act <span className="text-[color:var(--color-mute)]">Talent</span>
            </p>
            <p className="mt-3 max-w-[320px] text-sm text-[color:var(--color-mute)]">
              Hiring for international schools. Opening for the 2026 to 2027
              cycle.
            </p>
            <a
              href="mailto:hello@classacttalent.com"
              className="footer-link mt-3 inline-block text-sm"
            >
              hello@classacttalent.com
            </a>
          </div>

          <nav aria-label="Product">
            <p className="text-xs font-semibold tracking-[0.12em] text-[color:var(--color-mute)] uppercase">
              Product
            </p>
            <ul className="mt-4 flex flex-col items-start gap-2">
              {PRODUCT.map((p) => (
                <li key={p.id}>
                  <PanelButton id={p.id} className="footer-link text-sm">
                    {p.label}
                  </PanelButton>
                </li>
              ))}
            </ul>
          </nav>

          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <p className="text-xs font-semibold tracking-[0.12em] text-[color:var(--color-mute)] uppercase">
                {col.title}
              </p>
              <ul className="mt-4 flex flex-col gap-2">
                {col.links.map((l) => (
                  <li key={l.label}>
                    {l.href.startsWith("/") ? (
                      <Link href={l.href} className="footer-link text-sm">
                        {l.label}
                      </Link>
                    ) : (
                      <a href={l.href} className="footer-link text-sm">
                        {l.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <p className="mt-12 border-t border-[color:var(--color-line)] pt-6 text-xs text-[color:var(--color-mute)]">
          © 2026 Class Act Talent Ltd.
        </p>
      </div>
    </footer>
  );
}

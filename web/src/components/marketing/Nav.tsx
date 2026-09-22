import Link from "next/link";
import { Wordmark } from "./Wordmark";

const links = [
  { href: "#teachers", label: "For teachers" },
  { href: "#schools", label: "For schools" },
  { href: "#how", label: "How it works" },
  { href: "#trust", label: "Trust & safety" },
];

export function Nav() {
  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-[color:var(--color-canvas)]/85 border-b border-[color:var(--color-line)]/70">
      <div className="wrap flex items-center justify-between h-[72px]">
        <Link href="/" className="flex items-center">
          <Wordmark />
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-[14px] font-medium text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-navy)] transition-colors"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <a href="#login" className="btn btn-ghost hidden sm:inline-flex">
            Log in
          </a>
          <a href="#get-started" className="btn btn-primary">
            Get started
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M5 12h14M13 6l6 6-6 6"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
        </div>
      </div>
    </header>
  );
}

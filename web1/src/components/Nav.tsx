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
    <header className="sticky top-0 z-40 w-full border-b border-[color:var(--color-rule)] bg-[color:var(--color-paper)]/92 backdrop-blur-sm">
      <div className="wrap flex h-[78px] items-center justify-between gap-6">
        <Link href="/" className="shrink-0">
          <Wordmark />
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="label link !text-[color:var(--color-navy-2)]"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a href="#login" className="btn btn-outline hidden !py-[12px] !px-[18px] sm:inline-flex">
            Log in
          </a>
          <a href="#get-started" className="btn btn-gold !py-[13px] !px-[20px]">
            Get started
          </a>
        </div>
      </div>
    </header>
  );
}

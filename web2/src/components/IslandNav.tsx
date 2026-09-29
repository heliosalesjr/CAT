"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelButton, usePanels, type PanelId } from "./panels";
import { useEffect, useState } from "react";

const PANELS: { id: PanelId; label: string }[] = [
  { id: "how", label: "How it works" },
  { id: "where", label: "Where we hire" },
  { id: "questions", label: "Questions" },
];

/**
 * B7 fluid island nav.
 *
 * A floating pill detached from the top. The menu lives behind a
 * hamburger at every width rather than only on mobile: the page has
 * four destinations, and a pill that stays a pill reads far less like
 * a template than the usual full width bar.
 *
 * The hamburger lines rotate and translate into an X. They are
 * absolutely positioned and never set to opacity 0, so the shape
 * morphs rather than swapping.
 */
export function IslandNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { current } = usePanels();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Opening a panel puts the menu away; leaving both up stacks two
  // overlays and the menu shows through the panel.
  useEffect(() => {
    if (current) setOpen(false);
  }, [current]);

  // Hold the page still while the overlay is up.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <nav className="island mx-auto mt-6 w-max" aria-label="Main">
        <Link
          href="/"
          aria-current={pathname === "/" ? "page" : undefined}
          className="island-brand"
          onClick={() => setOpen(false)}
        >
          Class Act <span className="island-brand-light">Talent</span>
        </Link>

        <button
          type="button"
          className="island-burger"
          aria-expanded={open}
          aria-controls="island-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="island-burger-lines" data-open={open || undefined}>
            <span />
            <span />
          </span>
        </button>

        <Link href="/#start" className="btn btn-sm btn-gold" onClick={() => setOpen(false)}>
          Get started
        </Link>
      </nav>

      <div id="island-menu" className="island-menu" data-open={open || undefined} inert={!open}>
        <ul>
          {PANELS.map((p, i) => (
            <li key={p.id} style={{ "--i": i } as React.CSSProperties}>
              <PanelButton id={p.id} className="island-menu-item">
                {p.label}
              </PanelButton>
            </li>
          ))}
          <li style={{ "--i": PANELS.length } as React.CSSProperties}>
            <Link href="/#start" onClick={() => setOpen(false)}>
              Create a profile
            </Link>
          </li>
        </ul>
      </div>
    </header>
  );
}

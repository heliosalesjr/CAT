import { Hero } from "@/components/Hero";
import "./hero-lab.css";

/**
 * Five colour treatments of the same hero, stacked.
 *
 * Deliberately NOT force-dynamic: the terrain sheet is picked once
 * and frozen, so reloading compares colour against colour instead of
 * against a different map. Within a single render, currentSheet()'s
 * cache() already guarantees they all draw the same place.
 *
 * Every variant renders the real <Hero />. Nothing is cloned, so
 * there is no copy here to drift out of step with the live component
 * — each one is the shipping hero with brand tokens re-pointed for
 * its subtree. See hero-lab.css for what each variant moves.
 *
 * Throwaway. When a direction is chosen, delete this folder and
 * apply the winning values to globals.css.
 */

type Variant = {
  id: string;
  name: string;
  thesis: string;
  /** Measured caveats worth seeing next to the thing itself. */
  note?: string;
  swatches: { hex: string; role: string }[];
};

const VARIANTS: Variant[] = [
  {
    id: "a",
    name: "Gold where it works",
    thesis:
      "Your own read, applied literally: the gold is untouched, only the ground under it changes. On navy it hits 7.6:1 and reads as metal instead of beige — and the terrain finally gets to glow.",
    swatches: [
      { hex: "#19304d", role: "ground" },
      { hex: "#f1bb4c", role: "gold \u00b7 7.6:1" },
      { hex: "#81c4cf", role: "lit ridge" },
      { hex: "#65b67f", role: "verified" },
    ],
  },
  {
    id: "b",
    name: "Neutral sheet, gold kept",
    thesis:
      "The other half of the question: was it the gold, or the cream under it? Only the paper and hairlines move — every accent stays exactly as it is today.",
    note:
      "Measured: cooling the sheet moves gold from 1.66:1 to 1.64:1 — i.e. not at all. Gold on any pale ground is low-contrast and always will be. What this buys is hue separation, not legibility. Judge it on muddiness, not clarity.",
    swatches: [
      { hex: "#f7f7f4", role: "sheet" },
      { hex: "#d8d8d0", role: "hairline" },
      { hex: "#f1bb4c", role: "gold \u00b7 unchanged" },
    ],
  },
  {
    id: "c",
    name: "Green leads, vivid yellow punctuates",
    thesis:
      "On B's lighter sheet now, so the green sits on a neutral ground instead of a warm one. Green still takes the destination and the button. The yellow is the live one \u2014 #ffc107 at 100% saturation against the old gold's 85% \u2014 and it lands as a filled chip on the country code.",
    note:
      "The chip is forced by the measurement, not taste: #ffc107 is 1.5:1 on this sheet, so as thin type or a hairline it would not be visible at all. Filled, with navy on it, the identical colour is 8.2:1 \u2014 the strongest contrast in the lab. Vivid yellow has to be filled to exist.",
    swatches: [
      { hex: "#f7f7f4", role: "sheet \u00b7 from B" },
      { hex: "#1f8a52", role: "destination" },
      { hex: "#177a47", role: "button \u00b7 5.0:1" },
      { hex: "#ffc107", role: "yellow chip \u00b7 8.2:1" },
    ],
  },
  {
    id: "d",
    name: "B on the near-white sheet",
    thesis:
      "B's gold, untouched, on the lightest ground in the lab \u2014 #fbfcfd, white with a breath of blue in it. Only the sheet moves; the contours stay as they are in A through C, so this is B with exactly one variable changed.",
    note:
      "The lighter sheet barely touches the gold: 1.64:1 on B's sheet, 1.71:1 here. Gold on any light ground stays low-contrast. What changes is hue separation \u2014 the sheet is cool and the gold is warm, with nothing left in the paper for it to blend into. Judge it on whether the gold looks like gold rather than like a stain.",
    swatches: [
      { hex: "#fbfcfd", role: "near-white sheet" },
      { hex: "#dde5ee", role: "hairline" },
      { hex: "#f1bb4c", role: "gold \u00b7 unchanged" },
    ],
  },
  {
    id: "e",
    name: "C on the near-white sheet",
    thesis:
      "C's green leading and vivid yellow punctuating, on the same lighter ground as D. Where the gold gained nothing, the green gains: it is a dark accent, so a lighter sheet widens the tonal gap instead of closing it.",
    note:
      "The destination goes from 4.06:1 on B's sheet to 4.25:1, the button from 5.00:1 to 5.23:1. The yellow chip is identical either way \u2014 it carries navy on a filled field, so the sheet behind it never enters the sum.",
    swatches: [
      { hex: "#fbfcfd", role: "near-white sheet" },
      { hex: "#1f8a52", role: "destination \u00b7 4.25:1" },
      { hex: "#177a47", role: "button \u00b7 5.2:1" },
      { hex: "#ffc107", role: "yellow chip \u00b7 8.2:1" },
    ],
  },
];

export const metadata = { title: "Hero lab — Class Act Talent" };

export default function HeroLab() {
  return (
    <main className="flex-1">
      <nav className="lab-strip">
        <strong>Hero lab</strong>
        {VARIANTS.map((v) => (
          <a key={v.id} href={`#hero-${v.id}`}>
            {v.id.toUpperCase()} · {v.name}
          </a>
        ))}
      </nav>

      {VARIANTS.map((v) => (
        <section key={v.id} id={`hero-${v.id}`}>
          <header className="lab-head">
            <span className="lab-letter">{v.id.toUpperCase()}</span>
            <span className="lab-name">{v.name}</span>
            <p className="lab-thesis">{v.thesis}</p>
            {v.note && <p className="lab-note">{v.note}</p>}
          </header>

          <div className="lab-swatches">
            {v.swatches.map((s) => (
              <span key={s.role} className="lab-swatch">
                <span
                  className="lab-chip"
                  style={{ background: s.hex }}
                  aria-hidden="true"
                />
                {s.hex} {s.role}
              </span>
            ))}
          </div>

          {/* The real component, re-tokened for this subtree. */}
          <div data-hero={v.id}>
            <Hero />
          </div>
        </section>
      ))}
    </main>
  );
}

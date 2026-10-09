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
    name: "Vibrant orange",
    thesis:
      "The number that explains everything: today's gold is 40\u00b0 and the cream sheet is 43\u00b0 — the same hue, three degrees apart, differing only in lightness. That is what \u201cmuddy\u201d means. Orange sits at 20\u00b0, clear of the sheet and near the true complement of the navy, so it reads as deliberate contrast. Dark enough to be ink: the destination word is legible here for the first time.",
    swatches: [
      { hex: "#faf8f3", role: "sheet \u00b7 unchanged" },
      { hex: "#cf4a02", role: "orange \u00b7 4.3:1 as ink" },
      { hex: "#b03e02", role: "pressed" },
      { hex: "#65b67f", role: "verified" },
    ],
  },
  {
    id: "e",
    name: "Green + vivid yellow, near-white",
    thesis:
      "The only one that moves the sheet instead of arguing about an accent on cream. White with a breath of blue in it, so the warmth that made gold go muddy is simply not there to fight \u2014 and the terrain stops being grey: those contour lines go from 26% saturation to 73% at the same lightness. Same weight on the page, far more blue. Then two full-chroma hues, each owning a job: green is where (lit ridge, destination, checks), yellow is what you do (the button), navy is the type. The terrain keeps its blue \u2014 green took the cobalt's job, not the map's.",
    note:
      "The green is matched to the cobalt it replaces rather than picked by eye: #009a4e is 100% saturated, exactly like #0b5fff was, one step brighter. And yellow never becomes a line or a letter here \u2014 #ffc107 is 1.5:1 on this sheet, invisible as a hairline. Filled with navy on it, the same colour is 8.2:1. That constraint is the rule this variant turns on.",
    swatches: [
      { hex: "#fbfcfd", role: "near-white sheet" },
      { hex: "#9dc4f0", role: "terrain \u00b7 still blue" },
      { hex: "#009a4e", role: "green \u00b7 where" },
      { hex: "#ffc107", role: "yellow field \u00b7 8.2:1" },
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

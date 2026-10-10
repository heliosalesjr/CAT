# Class Act Talent

Ethical recruitment for international schools: a two-sided platform matching
verified, safeguarded teachers with schools, from Seoul to Bogotá.

The design is a **survey sheet**. Contour lines run under every section as one
continuous terrain, cropped differently each time, so the product reads as one
place seen at several scales rather than a set of unrelated backgrounds. Type is
set in capitals with the measured, slightly clinical voice of printed
cartography. Corners are square. Depth comes from hairlines and a change of
ground, never from a drop shadow.

This system is drawn from the live Next.js site and from hero options **D** and
**E**, which share one ground and differ only in their accent. Every value here
is the value that ships — nothing is approximated.

## The two grounds

`light` ("Sheet") is the near-white page, `#fbfcfd`: white with a breath of blue
in it. `navy` ("Navy") is the dark band used for the problem statement, the
manifesto and the footer. They are not light and dark modes — a page uses both,
in sequence, and every token carries a value for each.

The sheet was neutral by decision. An earlier warm cream (`#faf8f3`) sat three
degrees of hue from the gold on top of it, which is the measurable definition of
muddy: no hue contrast, so the eye read the gold as dirty paper. Taking the
warmth out of the ground is what let an accent exist at all.

## Two accent options

Both are in the tokens, and `accent-options.md` sets out the choice. In short:

- **Gold** (option D) is the logo's, and is a **fill only** on the sheet. As
  text on `surface` it measures 2.3:1 and fails; on `navy` it reads 7.6:1 and
  may be type. This is not a flaw to design around — it is the rule.
- **Green** (option E) is the compass-ring green, and works in both directions:
  4.25:1 as display type, 5.2:1 at reading size and as a button fill.

Pick one as the product accent. Do not run both as peers — that was tried and it
reads as patchwork.

## Rules that are not negotiable

**Vivid yellow must be filled to exist.** `#ffc107` on the sheet is 1.5:1. As
type or as a hairline it is invisible; as a field with `ink` on it, the same
colour is 8.2:1 — the strongest contrast in the system. So yellow appears as a
chip, a bar or a block, never as a letter or a line. Where a yellow line is
genuinely needed, `yellow-deep` is the one weight that survives.

**Blue is the map, never the interface.** `contour`, `contour-deep` and
`map-signal` draw terrain. The moment a label, button or tag takes one of them,
the system stops reading as a map with an interface on it and starts reading as
a pile of coloured parts.

**Semantic colour is not the accent.** `positive`, `caution` and `critical` say
what state something is in. They are separate from whichever accent you pick,
and they are told apart by lightness as well as hue, so they survive greyscale
and the common colour-blindness types.

**Control edges use `border-control`, not `rule`.** `rule` is a decorative
hairline at 1.2:1. Anything a person can click, type into or focus takes
`border-control`, which clears 3:1 in both grounds.

## Type

Two families, split by job.

**Google Sans** sets every heading and figure. Its weight axis stops at 700, so
the extra mass comes from `GRAD` — a grade axis thickens strokes without
changing advance widths, which means a heading gains weight without its line
breaks moving. The grade steps down as the type gets smaller, because the same
grade reads heavier at 17px than at 56px: 120 for display sizes and figures, 80
for card titles, 40 for long uppercase passages.

**Archivo** keeps the map furniture: labels, readouts, legend keys, buttons.
Its width axis is the whole point — `wdth` 70 to 90 is what makes small type
read as a map label rather than UI chrome, and Google Sans has no width axis to
reach it with.

Neither axis survives in `tokens.json`, which has no field for
`font-variation-settings`. Each type style's usage note carries the setting it
needs; apply it alongside the class.

## Using this system

Tokens compile to CSS custom properties. The site itself consumes them through
Tailwind v4's `@theme` block in `src/app/globals.css`, where the token names are
prefixed (`--color-ink`, `--color-surface`). Components below are CSS classes,
not a JavaScript bundle — there is nothing to import, and the previews show the
markup each one expects.

The box in the corner of a survey sheet that says what the symbols mean — the
system's panel, used for feature lists, settings groups and dashboard sections.

It sits on `surface-raised` inside a single `rule` hairline, with four trimmed
corners in `map-signal` at 55% opacity. The corners are the one decorative
flourish the system allows, and they earn their place: they are the registration
marks a printed sheet carries, and they tell the reader this block is a legend
rather than a card.

Rows are divided by a `rule` hairline, never by a gap, so the panel reads as one
ruled object. Each row pairs a 46px symbol box with a `title` and a body
paragraph held to `measure`.

Symbol boxes take `map-signal` for their glyph and `border-control` for their
edge. This is the one place blue touches something interface-shaped, and it is
deliberate: a legend is map furniture. Everywhere else, blue stays in the
terrain.

No radius, no shadow. If a panel needs to float — a menu, a popper —
`shadow-panel` is the only shadow in the system, and a static panel never takes
it.

The consumer supplies the icon, heading and copy. Icons are single-stroke, drawn
on a 24px grid, and inherit `currentColor` so the symbol box controls their ink.

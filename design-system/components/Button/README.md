The primary action, square-cornered and set in condensed uppercase Archivo.

Four fills, and the choice is about ground, not emphasis:

- `btn-green` — the primary action under option E. `green-ink` carrying
  `surface`, 5.2:1.
- `btn-gold` — the primary action under option D. `gold` carrying `ink`,
  7.6:1. Gold is only ever a fill; it never becomes the button's text.
- `btn-navy` — the primary action on a light ground when the accent is spoken
  for, and the only fill that works on either ground.
- `btn-outline` — the secondary action. Its border is `border-control`, not
  `rule`, because the edge of a control has to clear 3:1.

Buttons carry the `btn-label` type style: 12.5px, `wdth` 90, 0.12em tracking.
Padding is `space-4` by `space-5`. Radius is zero — there is no rounded variant.

The consumer supplies the element (`<button>` or `<a>`) and the label. Labels
say what happens: "Join as a teacher", not "Submit". Keep the same verb through
the flow, so a button that says "Publish" produces a toast that says "Published".

Focus takes a 2px `green-deep` ring at 3px offset in both options, so the focus
state does not change when the accent does.

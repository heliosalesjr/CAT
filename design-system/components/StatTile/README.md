The dashboard figure: a label, a number, a sparkline and a trend chip.

The number is the `stat-number` style in Google Sans at `GRAD` 120, always with
`font-variant-numeric: tabular-nums` so figures line up down a column. A unit
suffix drops to Archivo at `wdth` 74 and `ink-subtle`, so it reads as annotation
rather than as part of the value.

Tiles sit in a grid whose 1px gaps are `rule` showing through — the separation
is a drawn hairline, not a gap, which keeps the group reading as one ruled table
rather than as floating cards. No shadow, no radius.

The trend chip states the comparison in words ("+18% vs 2025", "Above target"),
never a bare arrow. Its colour is semantic, not the accent: `positive` for
movement in the good direction, `critical` for a breach, and the neutral
`surface-sunken` where a change is real but carries no verdict — a median time
to hire falling is good, but the tile should not editorialise if the target is
unset.

Sparklines take their stroke from the same semantic token as the chip, with an
emphasised endpoint so the latest value is findable. They are decoration only
when they have no axis: if a reader needs to compare values, use a real chart.

The consumer supplies the figure, the label, the comparison text and the series.
Direction is the consumer's call too — a falling line is not automatically bad.

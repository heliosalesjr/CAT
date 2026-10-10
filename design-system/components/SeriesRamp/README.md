Five categorical colours for charts, and the rule that keeps them readable.

The ramp climbs in **lightness**, not hue. Neighbouring series are at least 0.08
apart in relative luminance, which means they stay distinguishable in greyscale,
in a printed report and to a reader with any of the common colour-blindness
types. Hue alone would fail all three.

| token | sheet | lightness | role |
| --- | --- | --- | --- |
| `series-1` | `#19304d` | 0.03 | the darkest — use first, it reads as the primary series |
| `series-2` | `#b3261e` | 0.11 | |
| `series-3` | `#2f8f58` | 0.21 | |
| `series-4` | `#3e9fb0` | 0.29 | |
| `series-5` | `#e0a800` | 0.44 | the lightest |

Use them in order. A two-series chart takes `series-1` and `series-3`, not
1 and 2, so the lightness gap is as wide as the data allows.

`series-5` is 2.1:1 on the sheet. That is fine for a bar or an area fill, which
are large, and too pale for a one-pixel line — give it a 2px stroke or move it
to a fill. The other four clear 3:1 as hairlines.

Chart furniture comes from the ink scale, never from the series: the baseline is
`border-control`, gridlines are `rule`, and all chart text is `ink-subtle`,
which holds 4.8:1 on the sheet and 6.2:1 on navy. Every gridline a chart draws
should have a label naming the value it sits at.

This is categorical only. A sequential or diverging scale is a different
problem — build it from one hue's lightness range rather than reaching for these.

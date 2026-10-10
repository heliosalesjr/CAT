A legend key, not a pill — the square tag that sits in the corner of a printed
survey sheet and says what a symbol means.

Two kinds. `key` is neutral: a hairline box in `border-control` with
`ink-muted` text, used for taxonomy — the facets a section covers, the tags on a
card. `chip` is a status, and it is **filled**, because that is the only way the
system's colour survives at 10px.

Status chips pair a surface with its matching ink:

| state | ground | text | contrast |
| --- | --- | --- | --- |
| Verified, on target | `positive-surface` | `positive-ink` | 7.0:1 / 5.3:1 |
| Needs attention | `caution-surface` | `caution-ink` | 8.2:1 both |
| Breached, overdue | `critical-surface` | `critical-ink` | 7.6:1 / 8.1:1 |

Caution is the reason chips are filled at all. There is no dark yellow that
stays yellow — push `#ffc107` far enough to carry text on a light ground and it
turns to olive. So caution is a yellow field with `ink` on it, and the other two
states follow the same form rather than being handled differently.

Each chip carries a dot as well as a colour, so the state survives greyscale and
the common colour-blindness types. The dot is the one place `radius-dot` is
allowed; everything else in the system is square.

Text is the `key-label` style: 10px, `wdth` 78, 0.18em tracking, uppercase.

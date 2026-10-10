A text input, its label and its error, squared off like everything else.

The border is `border-control` at 4.0:1, not the decorative `rule` — a control's
edge has to be findable. On focus the border takes `green-deep` and a 2px ring
at 2px offset sits outside it, so focus is visible against both the field and
the page.

Labels are the `label` style in `ink-subtle`, uppercase at `wdth` 76. Placeholder
text is `ink-subtle` too and never carries meaning a reader needs — anything
required to fill the field in goes in the hint below it, which survives typing.

An invalid field takes `critical` on its border and thickens the left edge to
3px, so the state is carried by shape as well as colour. The message sits under
the field in `critical-ink`, with an icon, and is wired with
`aria-describedby`.

Error copy says what went wrong and what to do about it, in the interface's
voice: "Finish the address after the @ — we send the verification link there."
Not "Invalid email", and no apology.

The consumer supplies the element, its `id`, the label text and validation.
Every control needs a stable `id`: the platform carries form values and focus
across a republish, and an unnamed field loses both.

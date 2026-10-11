# Fonts

`GoogleSans-latin.woff2` — the latin subset of Google Sans, variable on the
GRAD and wght axes, fetched once from the Google Fonts CSS API.

**Licence: SIL Open Font License 1.1.** Google Sans sits in the open
`google/fonts` catalogue at `ofl/googlesans` with `license: "OFL"`, so
self-hosting and redistributing the file is permitted. The OFL text is at
<https://github.com/google/fonts/blob/main/ofl/googlesans/OFL.txt>.

## Why the file is here rather than fetched by next/font/google

Two reasons, and the second is the one that matters:

1. `next/font/google` downloads the face at build time and serves it from this
   origin anyway, so this is the same amount of self-hosting with the fetch
   made explicit and pinned.
2. It is the only way to stop the "Failed to find font override values for
   font `Google Sans`" warning Next logs on every compile. That message comes
   from one file — `@next/font/dist/google/get-fallback-font-override-metrics.js`
   — which looks the family up in a table of known metrics and cannot find it.
   `adjustFontFallback: false`, the documented escape hatch, is ignored under
   Turbopack. `next/font/local` never calls that function: it reads the metrics
   out of the file itself, so there is no table to miss.

The warning was cosmetic, but the fallback face it was failing to build is
not — without it there is no metric-matched stand-in and the headings shift
when the real face arrives. Local loading produces the fallback properly.

## Coverage

This is the `latin` subset only: ASCII plus Latin-1 Supplement, so á ã é í ó ú
ñ ö ü ç all render. Eastern European glyphs (ł ș ő ż) are in `latin-ext`, which
is a separate file the API serves at a separate unicode-range, and
`next/font/local` has no per-face unicode-range. The declared range below means
a glyph outside it falls back to Archivo rather than rendering as tofu.

If teacher names start needing latin-ext, the fix is to subset both into one
file at build time, or to go back to a `<link>` and accept the third-party
request.

## Refreshing

```
curl -A '<a modern browser UA>' \
  'https://fonts.googleapis.com/css2?family=Google+Sans:GRAD,wght@-50..150,400..700&display=swap'
```
Take the `latin` block's `src` url and its `unicode-range`; the range is
repeated in `src/app/layout.tsx`.

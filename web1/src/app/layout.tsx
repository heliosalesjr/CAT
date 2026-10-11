import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

/**
 * Two families, split by job.
 *
 * Google Sans sets the headings. Archivo keeps the map furniture —
 * labels, readouts, legend keys — because its width axis condenses
 * and Google Sans has none; those narrow widths are what make the
 * small type read as cartography rather than as UI chrome.
 */

/* Loaded from a file in this repo rather than through next/font/google.
   Same self-hosting either way — next/font/google downloads the face at build
   time and serves it from this origin too — but the local loader reads the
   fallback metrics out of the file instead of looking the family up in a table
   that has no entry for it. That lookup is the sole source of the "Failed to
   find font override values for font `Google Sans`" line Next printed on every
   compile, and `adjustFontFallback: false` does not silence it under Turbopack.

   The warning was cosmetic; what it was failing to build is not. Without those
   metrics there is no stand-in face matched to Google Sans's proportions, so
   headings jump when the real file arrives. This produces it properly.

   Licence is OFL — see src/app/fonts/README.md for provenance and how to
   refresh the file. */
const googleSans = localFont({
  src: [{ path: "./fonts/GoogleSans-latin.woff2", weight: "400 700", style: "normal" }],
  variable: "--font-googlesans",
  display: "swap",
  /* Arial's metrics are the closest of the two stand-ins Next offers, and
     naming one is what makes the fallback face get built at all. */
  adjustFontFallback: "Arial",
  /* The latin subset's own range. Declaring it lets the browser fall back
     per glyph for anything outside it, instead of assuming full coverage and
     rendering tofu. */
  declarations: [{ prop: "unicode-range", value: "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD" }],
});

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  display: "swap",
  axes: ["wdth"],
});

export const metadata: Metadata = {
  title: "Class Act Talent — Ethical recruitment for international schools",
  description:
    "The two-sided platform that matches international schools with verified, safeguarded teachers — from Seoul to Bogotá. Transparent AI, real feedback, zero silence.",
  metadataBase: new URL("https://classacttalent.com"),
  openGraph: {
    title: "Class Act Talent",
    description:
      "Ethical recruitment for international schools. Verified trust for teachers.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Class Act Talent",
    description: "Ethical recruitment for international schools.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${googleSans.variable} ${archivo.variable} h-full`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

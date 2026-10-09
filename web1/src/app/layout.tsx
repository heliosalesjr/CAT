import type { Metadata } from "next";
import { Archivo, Google_Sans } from "next/font/google";
import "./globals.css";

/**
 * Two families, split by job.
 *
 * Google Sans sets the headings. Archivo keeps the map furniture —
 * labels, readouts, legend keys — because its width axis condenses
 * and Google Sans has none; those narrow widths are what make the
 * small type read as cartography rather than as UI chrome.
 */

/* Loaded through next/font, which self-hosts the files from this
   origin. That matters now that it is the shipping heading face:
   no DNS and TLS round trip to fonts.gstatic.com before the hero can
   paint, and no third-party request at all — this site serves
   international schools, so European visitors are the norm and
   Google Fonts CDN calls are the kind of thing their data officers
   ask about.

   The cost is one line on every compile: "Failed to find font
   override values for font `Google Sans`". Next has no metrics for
   this family, so it cannot build the fallback face that masks
   layout shift while the real one loads. It is a warning, not an
   error, and `adjustFontFallback: false` does not silence it under
   Turbopack. To trade self-hosting for a quiet terminal, drop this
   and load the family with a <link> to fonts.googleapis.com. */
const googleSans = Google_Sans({
  variable: "--font-googlesans",
  subsets: ["latin"],
  display: "swap",
  /* Weight stops at 700, so headings get their extra mass from GRAD
     instead; see the type scale in globals.css. */
  axes: ["GRAD"],
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

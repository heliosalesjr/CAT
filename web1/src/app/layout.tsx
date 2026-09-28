import type { Metadata } from "next";
import { Archivo, Cinzel, Google_Sans, Roboto } from "next/font/google";
import { TypefaceSwitch } from "@/components/TypefaceSwitch";
import "./globals.css";

/**
 * One family, three widths. The width axis is what makes the
 * cartographic voice possible: expanded for the display, normal for
 * reading, condensed for the map labels.
 */
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  display: "swap",
  axes: ["wdth"],
});

/* --- Typeface preview -------------------------------------------
 * Two alternates for the headings, switchable in the browser while we
 * decide. To ship one of them: set it as --font-display in
 * globals.css, then delete the other two font imports, the
 * TYPEFACE_PREVIEW block below, and src/components/TypefaceSwitch.tsx.
 * ---------------------------------------------------------------- */
const TYPEFACE_PREVIEW = true;

/* Roman inscriptional capitals — the lettering carved on monuments and
   engraved into map cartouches. A capitals face by design, which is
   why it is the one that thrives in an all-caps system. */
const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

/* Google's own brand sans, published to Google Fonts. Its weight axis
   stops at 700, so the extra mass for headings comes from GRAD — a
   grade axis thickens strokes without changing the width, which is
   what keeps line breaks stable. */
const googleSans = Google_Sans({
  variable: "--font-googlesans",
  subsets: ["latin"],
  display: "swap",
  axes: ["GRAD"],
  preload: false,
});

/* Roboto's width axis runs 75-100: it condenses but does not expand,
   so it cannot reach the 116 the headings use in Archivo and will set
   noticeably narrower. */
const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  display: "swap",
  axes: ["wdth"],
  preload: false,
});

/* Applies the stored choice before first paint, so switching and then
   reloading never flashes the previous face. */
const RESTORE_TYPEFACE = `try{var t=localStorage.getItem("cat-typeface");if(t&&t!=="archivo")document.documentElement.dataset.typeface=t}catch(e){}`;

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
      /* The inline script below writes data-typeface onto this element
         before React hydrates, and the server cannot know which face a
         given browser has stored. That is a legitimate mismatch on this
         one element, not a bug to chase — React is told to leave it
         alone. Tied to the preview flag so the suppression disappears
         together with the scaffolding. */
      suppressHydrationWarning={TYPEFACE_PREVIEW}
      className={`${archivo.variable} ${
        TYPEFACE_PREVIEW ? `${cinzel.variable} ${googleSans.variable} ${roboto.variable}` : ""
      } h-full`}
    >
      {TYPEFACE_PREVIEW && (
        <head>
          <script dangerouslySetInnerHTML={{ __html: RESTORE_TYPEFACE }} />
        </head>
      )}
      <body className="min-h-full flex flex-col">
        {children}
        {TYPEFACE_PREVIEW && <TypefaceSwitch />}
      </body>
    </html>
  );
}

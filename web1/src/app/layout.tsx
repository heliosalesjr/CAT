import type { Metadata } from "next";
import { Archivo } from "next/font/google";
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
    <html lang="en" className={`${archivo.variable} h-full`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

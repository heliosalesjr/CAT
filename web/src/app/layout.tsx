import type { Metadata } from "next";
import { Lora, Karla } from "next/font/google";
import "./globals.css";

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "600", "700"],
});

const karla = Karla({
  variable: "--font-karla",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
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
      className={`${lora.variable} ${karla.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

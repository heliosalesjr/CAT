import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Footer } from "@/components/Footer";
import { IslandNav } from "@/components/IslandNav";
import { PanelProvider } from "@/components/panels";
import "./globals.css";

/* B1: one typeface for the whole site, from the approved list. */
const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://classacttalent.com"),
  title: "Class Act Talent — ranked applicants and verified references for international schools",
  description:
    "Schools search the whole candidate pool and see why every match ranks where it does. Teachers track each application through to a decision. Opening for the 2026 to 2027 hiring cycle.",
  openGraph: {
    title: "Class Act Talent",
    description:
      "Ranked applicants, verified references, and a reply for every candidate.",
    type: "website",
    locale: "en_US",
    images: ["/og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Class Act Talent",
    description:
      "Ranked applicants, verified references, and a reply for every candidate.",
  },
  icons: { icon: "/icon.svg" },
};

/**
 * Arms the scroll reveals, then disarms itself if the observer never
 * installs.
 *
 * The reveal styles only apply under [data-anim], so with scripting
 * off the page renders plainly and completely. The timeout covers the
 * worse case: scripting on, hydration broken. Without it, a failed
 * bundle would leave every section permanently invisible.
 */
const BOOT = `(function(){var d=document.documentElement;try{if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;d.setAttribute("data-anim","");setTimeout(function(){if(!d.hasAttribute("data-anim-ready"))d.removeAttribute("data-anim")},3000)}catch(e){d.removeAttribute("data-anim")}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      /* The boot script writes data-anim onto this element before React
         hydrates, and the server cannot know whether a given visitor
         prefers reduced motion. A real and intended mismatch on this
         one element. */
      suppressHydrationWarning
      className={`${geist.variable} h-full`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: BOOT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        {/* Nav and footer live here so every route has navigation and a
            way back, which the detail pages need as much as home. */}
        <PanelProvider>
          <IslandNav />
          {children}
          <Footer />
        </PanelProvider>
      </body>
    </html>
  );
}

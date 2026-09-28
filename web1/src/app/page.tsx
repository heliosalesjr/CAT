import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
import { TrustBar } from "@/components/TrustBar";
import { ProblemBlock } from "@/components/ProblemBlock";
import { HowItWorks } from "@/components/HowItWorks";
import { FeatureGrid } from "@/components/FeatureGrid";
import { Stats } from "@/components/Stats";
import { Breakthrough } from "@/components/Breakthrough";
import { Testimonials } from "@/components/Testimonials";
import { TwoPathCTA } from "@/components/TwoPathCTA";
import { Footer } from "@/components/Footer";

/**
 * Rendered per request so each visit draws a different contour sheet.
 * Remove this to go back to a static page with a sheet fixed at build
 * time — see src/components/sheet.ts.
 */
export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <>
      <Nav />
      <main className="flex-1">
        <Hero />
        <TrustBar />
        <ProblemBlock />
        <HowItWorks />
        <FeatureGrid />
        <Stats />
        <Breakthrough />
        <Testimonials />
        <TwoPathCTA />
      </main>
      <Footer />
    </>
  );
}

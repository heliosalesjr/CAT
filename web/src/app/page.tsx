import { Nav } from "@/components/marketing/Nav";
import { Hero } from "@/components/marketing/Hero";
import { TrustBar } from "@/components/marketing/TrustBar";
import { ProblemBlock } from "@/components/marketing/ProblemBlock";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { FeatureGrid } from "@/components/marketing/FeatureGrid";
import { Stats } from "@/components/marketing/Stats";
import { Breakthrough } from "@/components/marketing/Breakthrough";
import { Testimonials } from "@/components/marketing/Testimonials";
import { TwoPathCTA } from "@/components/marketing/TwoPathCTA";
import { Footer } from "@/components/marketing/Footer";

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

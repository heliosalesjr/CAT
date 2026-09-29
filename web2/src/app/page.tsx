import { Hero } from "@/components/Hero";
import { Gateway } from "@/components/Gateway";

/* Hero, one section, footer. Everything else opens from the menu. */
export default function Home() {
  return (
    <main id="main" className="flex-1">
      <Hero />
      <Gateway />
    </main>
  );
}

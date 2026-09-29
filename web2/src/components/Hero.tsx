import { HeroBackdrop } from "./HeroBackdrop";
import { Reveal } from "./Reveal";

export function Hero() {
  return (
    <section className="hero">
      <HeroBackdrop />

      <div className="shell hero-body">
        <div className="hero-panel">
        <Reveal delay={100}>
          <h1 className="text-2xl font-semibold text-[color:var(--color-paper)] md:text-4xl">
            Ranked applicants, verified references,
            <br />
            and a reply for every candidate.
          </h1>
        </Reveal>

        <Reveal delay={200}>
          <p className="mt-4 text-base text-[color:var(--color-mute-2)]">
            The hiring platform for international schools. Search the whole
            candidate pool and see why each match ranks where it does.
          </p>
        </Reveal>

        <Reveal delay={300}>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a href="#start" className="btn btn-gold">
              Create a teacher profile
            </a>
            <a
              href="mailto:schools@classacttalent.com?subject=Demo%20request"
              className="btn btn-ghost-light"
            >
              Book a school demo
            </a>
          </div>
        </Reveal>

        <Reveal delay={400}>
          <p className="mt-6 text-sm text-[color:var(--color-mute-2)]">
            Free for teachers. Schools pay by enrollment, not by the posting.
          </p>
        </Reveal>
        </div>
      </div>
    </section>
  );
}

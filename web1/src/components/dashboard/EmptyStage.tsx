import { Contours } from "@/components/Contours";

/**
 * The shared stage for both dashboards' empty states.
 *
 * Two problems it solves. The content was sitting at the top of a tall
 * viewport with a field of white under it, which reads as a page that failed
 * to load rather than one waiting to start. And an account with nothing in it
 * is the first thing every real user sees and the thing a prospect is shown,
 * so it is the worst place for the product to look unfinished.
 *
 * The terrain is the same survey sheet the marketing site is built on — the
 * same component, the same data, three crops of one place. Here it runs at a
 * fraction of the opacity and drifts slowly, so it reads as paper texture
 * rather than as a background image. Ambient motion is normally decoration,
 * and decoration is normally the wrong answer; a first-run screen is the one
 * place it earns its keep, because the whole job of the screen is to make an
 * empty account feel like somewhere worth being.
 */
export function EmptyStage({
  label, title, blurb, actions, steps, stepsTitle,
}: {
  label?: string;
  title: string;
  blurb: string;
  actions: React.ReactNode;
  steps: { h: string; p: string }[];
  stepsTitle?: string;
}) {
  return (
    <section className="stage">
      <div className="stage-terrain" aria-hidden="true">
        {/* Three elevation bands, drifting at different rates. The parallax
            comes from the speed difference, not from following a cursor —
            nobody is hunting for depth on a page with nothing in it. */}
        <div className="stage-band" data-depth="low">
          <Contours viewBox="80 60 1040 680" strokeWidth={1} levels={[0, 1, 2, 3]} />
        </div>
        <div className="stage-band" data-depth="mid">
          <Contours viewBox="140 90 960 620" strokeWidth={1} levels={[5, 6, 7, 8]} />
        </div>
        <div className="stage-band" data-depth="high">
          <Contours viewBox="220 140 820 520" strokeWidth={1}
                    levels={[9, 10, 11]} highlight={[10]} />
        </div>
      </div>

      {/* Paper lifts under the type so the linework never competes with it —
          the same device the hero uses. */}
      <div className="stage-lift" aria-hidden="true" />

      <div className="stage-content">
        <div className="stage-lead">
          {label && <span className="label">{label}</span>}
          <h1>{title}</h1>
          <p>{blurb}</p>
          <div className="stage-actions">{actions}</div>
        </div>

        <ol className="stage-steps">
          {stepsTitle && <li className="stage-steps-head"><span className="label">{stepsTitle}</span></li>}
          {steps.map((s, i) => (
            <li key={s.h}>
              <span className="stage-step-n num">{i + 1}</span>
              <span>
                <strong>{s.h}</strong>
                <span>{s.p}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

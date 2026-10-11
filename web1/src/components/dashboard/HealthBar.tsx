import type { Summary } from "@/lib/dashboard-data";

/**
 * Zone 1. Not four equal cards: one figure carries the screen.
 *
 * "22 waiting on you" is the emotional centre, so it gets the display size and
 * the critical colour. The median sits beside it deliberately, because on its
 * own the median is a flattering lie — 3 days is the median of the 45 people
 * who got an answer, and it silently drops the 52 who never did. The split bar
 * is the argument: you can see the majority of the bar is the part the median
 * never counted.
 */
export function HealthBar({ summary }: { summary: Summary }) {
  const { respondedCount: answered, neverRespondedCount: never } = summary;
  const total = answered + never;
  const neverPct = Math.round((never / total) * 100);

  return (
    <section className="dash-section" aria-labelledby="health">
      <h2 id="health" className="sr-only">Hiring health</h2>

      <div className="health">
        {/* The one thing she opened this page to find out. */}
        <div className="health-primary">
          <span className="label">Waiting on you</span>
          <span className="fig health-fig">{summary.candidatesAwaitingResponse}</span>
          <p className="health-primary-sub">
            candidates have had no answer.{" "}
            <strong>The longest has waited {summary.longestWaitDays} days.</strong>
          </p>
        </div>

        {/* The pairing. One claim, two numbers, and the bar that reconciles them. */}
        <div className="health-response">
          <span className="label">Response time</span>
          <div className="health-response-figs">
            <span><span className="fig health-fig-sm">{summary.medianResponseDays}</span>
              <span className="readout"> day median</span></span>
            <span className="health-vs">but</span>
            <span><span className="fig health-fig-sm health-fig-bad">{never}</span>
              <span className="readout"> never answered</span></span>
          </div>
          <div className="bar health-split" data-grow role="img"
               aria-label={`${answered} of ${total} applicants answered, ${never} never answered`}>
            <span style={{ width: `${100 - neverPct}%`, background: "var(--positive)" }} />
            <span style={{ width: `${neverPct}%`, background: "var(--critical)" }} />
          </div>
          <p className="health-note">
            The median counts only the {answered} people who got a reply. It
            excludes {never} of {total} — {neverPct}% of everyone who applied.
          </p>
        </div>

        {/* Context, not headline. */}
        <div className="health-side">
          <div>
            <span className="fig health-fig-sm">{summary.openPostings}</span>
            <span className="readout"> open postings</span>
            <p className="health-side-sub num">
              {summary.draftPostings} draft · {summary.onHoldPostings} on hold
            </p>
          </div>
          <div>
            <span className="fig health-fig-sm">{summary.interviewsNext7Days}</span>
            <span className="readout"> interviews, next 7 days</span>
            {summary.interviewFeedbackMissing > 0 && (
              <p className="health-side-sub">
                {summary.interviewFeedbackMissing} completed interview still has no feedback
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

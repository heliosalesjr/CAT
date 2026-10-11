import { OfferPanel } from "./OfferPanel";
import type { OfferContext, CandidateApplication } from "@/lib/dashboard-data";

const STAGES = ["applied", "screening", "interview", "offer"] as const;
const LABEL: Record<string, string> = {
  applied: "Applied", screening: "Screening", interview: "Interview", offer: "Offer",
};

/**
 * Zone 2. The heart of the page: one card per application, with the funnel
 * drawn so progress is visible without reading.
 *
 * An open offer is the loudest thing on the screen — he is deciding whether to
 * move a family across the world, and he should not have to hunt for it.
 *
 * A rejection is stated plainly with whatever reason the school gave. No red
 * cross, no strikethrough: someone read it and said no, and that deserves a
 * sentence rather than an icon.
 */
export function MyApplications({
  rows, offerContext,
}: { rows: CandidateApplication[]; offerContext: OfferContext }) {
  if (!rows.length) {
    return (
      <section className="dash-section" aria-labelledby="apps">
        <div className="dash-head"><h2 id="apps">Your applications</h2></div>
        <p className="queue-clear">
          Nothing in flight yet. Roles that fit your subjects and the regions you
          chose are below.
        </p>
      </section>
    );
  }

  return (
    <section className="dash-section" aria-labelledby="apps">
      <div className="dash-head">
        <h2 id="apps">Your applications</h2>
        <span className="readout">{rows.length} in flight</span>
      </div>

      <div className="app-grid">
        {rows.map((a) => {
          const terminal = a.stage === "rejected" || a.stage === "withdrawn";
          return (
            <article key={a.id} className="app-card" data-stage={a.stage}>
              {a.stage === "offer" && (
                <span className="app-offer-flag">
                  <span className="label">Offer open</span>
                  <span>They are waiting on your answer.</span>
                </span>
              )}

              <div className="app-top">
                <h3>{a.posting}</h3>
                <span className="readout">{a.school} · {a.city}, {a.country}</span>
              </div>

              {terminal ? (
                <p className="app-closed">
                  <span className="chip chip-neutral">
                    {a.stage === "rejected" ? "Not taken forward" : "You withdrew"}
                  </span>
                  {a.rejectionReason && <span>{a.rejectionReason}</span>}
                </p>
              ) : (
                <ol className="app-funnel" aria-label={`Stage: ${LABEL[a.stage]}`}>
                  {STAGES.map((s, i) => (
                    <li key={s} data-state={
                      i < a.stageIndex ? "done" : i === a.stageIndex ? "here" : "ahead"
                    }>
                      <span className="app-funnel-mark" />
                      <span className="readout">{LABEL[s]}</span>
                    </li>
                  ))}
                </ol>
              )}

              {a.stage === "offer" && (
                <OfferPanel application={a} context={offerContext} />
              )}

              <div className="app-meta">
                <span className="readout num">
                  {a.daysSinceStageChange}d at this stage
                </span>
                {a.schoolOwesResponse && (
                  <span className="chip chip-caution">
                    <span className="dot" style={{ background: "currentColor" }} />
                    They owe you a reply
                  </span>
                )}
                {a.startDate && (
                  <span className="readout">
                    Starts {new Date(a.startDate).toLocaleDateString("en-GB",
                      { month: "short", year: "numeric" })}
                  </span>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

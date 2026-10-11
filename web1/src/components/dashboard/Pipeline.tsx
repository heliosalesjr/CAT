import Link from "next/link";
import { ACTIVE_STAGES, type PipelineRow } from "@/lib/dashboard-data";

const STAGE_LABEL: Record<string, string> = {
  applied: "Applied", screening: "Screening", interview: "Interview", offer: "Offer",
};

/**
 * Zone 3. One row per live posting, with its pipeline as a single stacked bar.
 *
 * The stage colours are a lightness ramp of one hue rather than five different
 * hues: the stages are a sequence, and a sequence should read as one scale
 * getting darker, not as five unrelated categories.
 *
 * Every row carries a stripe, including the healthy ones. Giving the colour
 * only to the troubled postings made the rail look broken rather than
 * meaningful — a row with nothing wrong appeared to be missing something. The
 * presence of the stripe is constant; the colour is the signal.
 *
 * 47 applications is flagged as triage debt, not celebrated.
 */
export function Pipeline({ rows, canSeeSalary }: { rows: PipelineRow[]; canSeeSalary: boolean }) {
  const widest = Math.max(...rows.map((r) => r.applicationCount), 1);

  return (
    <section className="dash-section" aria-labelledby="pipeline">
      <div className="dash-head">
        <h2 id="pipeline">Pipeline by posting</h2>
        <p>
          Each rail is the same length; how much of it is filled is this
          posting&apos;s share of the busiest one. The shades are how far those
          applicants have got.
        </p>
        <Legend />
      </div>

      <div className="panel panel-rows">
        {rows.map((r) => {
          const active = ACTIVE_STAGES.reduce((n, s) => n + r.counts[s], 0);
          return (
            <article key={r.id} className="pipe-row" data-severity={r.trouble?.severity ?? "healthy"}>
              <div className="pipe-head">
                <div className="pipe-title">
                  <h3>{r.title}</h3>
                  <span className="pipe-meta readout">
                    {r.status === "on_hold" ? "On hold" : `${r.daysPosted}d posted`}
                    {" · "}{r.viewCount.toLocaleString("en-GB")} views
                    {r.openings > 1 && ` · ${r.openings} openings`}
                    {" · "}{r.likelihood}
                    {canSeeSalary && r.salaryMinUsd != null &&
                      ` · $${(r.salaryMinUsd / 1000).toFixed(0)}–${((r.salaryMaxUsd ?? 0) / 1000).toFixed(0)}k`}
                  </span>
                </div>

                {/* The right edge of the row is where the eye lands last, so it
                    carries the way out: who the ranking puts first, and a way
                    into the rest of them. */}
                {r.topCandidate && (
                  <Link href={`/dashboard/shortlists?posting=${r.id}`} className="pipe-lead">
                    <span className="readout">Leading candidate</span>
                    <span className="pipe-lead-name">
                      {r.topCandidate.name}
                      <span className="pipe-lead-go" aria-hidden="true">&rarr;</span>
                    </span>
                    {r.topCandidate.score != null ? (
                      <span className="pipe-lead-score">
                        <b className="num">{r.topCandidate.score}</b>
                        <span className="readout">score</span>
                      </span>
                    ) : (
                      <span className="readout">ranking off</span>
                    )}
                  </Link>
                )}
              </div>

              <div className="pipe-bar-wrap">
                {/* The rail is always the full width of the row, so the part
                    that is not filled is the rest of the scale rather than
                    dead space. The fill is this posting's share of the busiest
                    one; its segments are the stages inside it. */}
                <div className="pipe-rail" role="img"
                     aria-label={active > 0
                       ? `${r.applicationCount} applications: ` +
                         ACTIVE_STAGES.map((s) => `${r.counts[s]} ${STAGE_LABEL[s]}`).join(", ")
                       : "No applications"}>
                  {active > 0 && (
                    <div className="pipe-fill" data-grow
                         style={{ width: `${Math.max((r.applicationCount / widest) * 100, 3)}%` }}>
                      {ACTIVE_STAGES.map((s) =>
                        r.counts[s] > 0 ? (
                          <span key={s}
                                style={{ width: `${(r.counts[s] / active) * 100}%`,
                                         background: `var(--stage-${s})` }} />
                        ) : null,
                      )}
                    </div>
                  )}
                </div>

                <span className="pipe-counts num">
                  {active > 0 ? (
                    ACTIVE_STAGES.filter((s) => r.counts[s] > 0).map((s) => (
                      <span key={s}>
                        <b>{r.counts[s]}</b> <span className="readout">{STAGE_LABEL[s]}</span>
                      </span>
                    ))
                  ) : (
                    <span className="pipe-empty readout">No applications</span>
                  )}
                  {/* Says what the two numbers are. "23 of 47" was the scale's
                      denominator — this posting against the busiest — and read
                      as though 47 people had applied here. */}
                  <span className="pipe-share readout">
                    {r.rankedCount > 0 && (
                      <><b className="num">{r.rankedCount}</b> ranked
                        <span className="pipe-share-sep">·</span></>
                    )}
                    <b className="num">{r.applicationCount}</b> applied
                  </span>
                </span>
              </div>

              {r.trouble && (
                <p className="pipe-trouble">
                  <span className={`chip chip-${r.trouble.severity}`}>
                    <span className="dot" style={{ background: "currentColor" }} />
                    {r.trouble.label}
                  </span>
                  <span>{r.trouble.detail}</span>
                </p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function Legend() {
  return (
    <span className="pipe-legend">
      {ACTIVE_STAGES.map((s) => (
        <span key={s} className="readout">
          <span className="dot" style={{ background: `var(--stage-${s})` }} />
          {STAGE_LABEL[s]}
        </span>
      ))}
    </span>
  );
}

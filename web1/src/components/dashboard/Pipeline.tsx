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
 * A posting in trouble carries a severity stripe and a sentence saying what is
 * wrong. 47 applications is flagged as triage debt, not celebrated.
 */
export function Pipeline({ rows, canSeeSalary }: { rows: PipelineRow[]; canSeeSalary: boolean }) {
  const widest = Math.max(...rows.map((r) => r.applicationCount), 1);

  return (
    <section className="dash-section" aria-labelledby="pipeline">
      <div className="dash-head">
        <h2 id="pipeline">Pipeline by posting</h2>
        <p>Bar width is the number of applications; the shade is how far they have got.</p>
        <Legend />
      </div>

      <div className="panel panel-rows">
        {rows.map((r) => {
          const active = ACTIVE_STAGES.reduce((n, s) => n + r.counts[s], 0);
          return (
            <article key={r.id} className="pipe-row" data-severity={r.trouble?.severity ?? "none"}>
              <div className="pipe-head">
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

              <div className="pipe-bar-wrap">
                {active > 0 ? (
                  <div className="bar pipe-bar" data-grow
                       style={{ width: `${Math.max((r.applicationCount / widest) * 100, 4)}%` }}
                       role="img"
                       aria-label={ACTIVE_STAGES.map((s) => `${r.counts[s]} ${STAGE_LABEL[s]}`).join(", ")}>
                    {ACTIVE_STAGES.map((s) =>
                      r.counts[s] > 0 ? (
                        <span key={s}
                              style={{ width: `${(r.counts[s] / active) * 100}%`,
                                       background: `var(--stage-${s})` }} />
                      ) : null,
                    )}
                  </div>
                ) : (
                  <span className="pipe-empty readout">No applications</span>
                )}
                <span className="pipe-counts num">
                  {ACTIVE_STAGES.filter((s) => r.counts[s] > 0).map((s) => (
                    <span key={s}>
                      <b>{r.counts[s]}</b> <span className="readout">{STAGE_LABEL[s]}</span>
                    </span>
                  ))}
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

import type { Summary } from "@/lib/dashboard-data";

/**
 * Zone 6. Present, not prominent.
 *
 * time-to-hire is null across the board because this school has hired nobody
 * yet. That is said in a sentence rather than rendered as an empty table of
 * dashes — the competitor screenshots show exactly what the dash version looks
 * like, and it reads as a broken product.
 */
export function Analytics({ summary }: { summary: Summary }) {
  const weeks = summary.applicationsPerWeek;
  const peak = Math.max(...weeks.map((w) => w.count), 1);
  const funnel = ["applied", "screening", "interview", "offer"] as const;
  const widest = Math.max(...funnel.map((s) => summary.funnelCounts[s] ?? 0), 1);
  const hires = summary.timeToHireDays;

  return (
    <section className="dash-section" aria-labelledby="analytics">
      <div className="dash-head"><h2 id="analytics">Analytics</h2></div>

      <div className="an-grid">
        <div className="an-card">
          <span className="label">Applications per week</span>
          <div className="an-bars" role="img"
               aria-label={weeks.map((w) => `${w.weekStart}: ${w.count}`).join("; ")}>
            {weeks.map((w) => (
              <span key={w.weekStart} className="an-bar">
                <span className="an-bar-fill"
                      style={{ height: `${Math.max((w.count / peak) * 100, 3)}%` }} />
                <span className="readout num">{w.count}</span>
              </span>
            ))}
          </div>
          <span className="readout">
            Week of {weeks[0].weekStart.slice(5)} to {weeks.at(-1)!.weekStart.slice(5)}
          </span>
        </div>

        <div className="an-card">
          <span className="label">Funnel</span>
          <ul className="an-funnel">
            {funnel.map((s) => {
              const n = summary.funnelCounts[s] ?? 0;
              return (
                <li key={s}>
                  <span className="readout">{s}</span>
                  <span className="bar an-funnel-bar" data-grow>
                    <span style={{ width: `${(n / widest) * 100}%`, background: `var(--stage-${s})` }} />
                  </span>
                  <span className="num">{n}</span>
                </li>
              );
            })}
          </ul>
          <span className="readout">
            {summary.funnelCounts.rejected ?? 0} rejected · {summary.funnelCounts.withdrawn ?? 0} withdrawn
          </span>
        </div>

        <div className="an-card">
          <span className="label">Time to hire</span>
          {hires.average == null ? (
            <p className="an-nohires">
              No hires yet this cycle, so there is nothing to measure. This fills
              in after the first offer is accepted.
            </p>
          ) : (
            <p className="an-nohires num">
              {hires.shortest}–{hires.longest} days, {hires.average} average
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

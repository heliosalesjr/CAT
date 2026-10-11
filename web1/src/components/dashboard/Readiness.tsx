import type { CandidateSummary } from "@/lib/dashboard-data";

/**
 * Zone 1. The one measured-progress element on the page, and it earns the
 * space because an incomplete profile is what actually blocks matching:
 * below 70% a candidate is excluded from ranking entirely.
 *
 * Read as a pre-flight checklist, not a score. No celebration at 100, no
 * badge, no streak — the ring exists to show what is still missing before a
 * school can consider you.
 */
export function Readiness({ summary }: { summary: CandidateSummary }) {
  const { readiness } = summary;
  const parts = [
    { key: "profile", label: "Profile", value: readiness.profile },
    { key: "documents", label: "Documents", value: readiness.documents },
    { key: "references", label: "References", value: readiness.references },
  ];
  const belowRankingFloor = summary.profileCompleteness < 70;

  const R = 52, C = 2 * Math.PI * R, seg = C / 3, gap = 7;

  return (
    <div className="ready">
      <svg className="ready-ring" viewBox="0 0 140 140" role="img"
           aria-label={parts.map((p) => `${p.label} ${p.value}%`).join(", ")}>
        <g transform="rotate(-90 70 70)">
          {parts.map((p, i) => (
            <g key={p.key}>
              <circle cx="70" cy="70" r={R} fill="none" stroke="var(--surface-sunken)"
                      strokeWidth="11"
                      strokeDasharray={`${seg - gap} ${C - seg + gap}`}
                      strokeDashoffset={-i * seg} />
              {/* The filled length is handed over as a custom property so
                  CSS can draw it in from zero with @starting-style — no mount
                  flag, no effect, and the server-rendered value is already the
                  resting state if motion is off. */}
              <circle className="ready-arc" cx="70" cy="70" r={R} fill="none"
                      stroke={`var(--ready-${p.key})`} strokeWidth="11"
                      strokeDashoffset={-i * seg}
                      style={{
                        "--len": `${((seg - gap) * p.value) / 100}`,
                        "--c": `${C}`,
                        "--draw-delay": `${i * 90}ms`,
                      } as React.CSSProperties} />
            </g>
          ))}
        </g>
        <text x="70" y="64" textAnchor="middle" className="ready-pct">{readiness.overall}%</text>
        <text x="70" y="82" textAnchor="middle" className="ready-pct-label">ready</text>
      </svg>

      <div className="ready-legend">
        <span className="label">Before a school can consider you</span>
        <ul>
          {parts.map((p) => (
            <li key={p.key}>
              <span className="dot" style={{ background: `var(--ready-${p.key})` }} />
              <span className="ready-leg-label">{p.label}</span>
              <span className="bar ready-leg-bar" data-grow>
                <span style={{ width: `${p.value}%`, background: `var(--ready-${p.key})` }} />
              </span>
              <span className="num ready-leg-n">{p.value}%</span>
            </li>
          ))}
        </ul>
        {belowRankingFloor ? (
          <p className="ready-floor is-under">
            Your profile is below 70%, so schools using the ranking do not see
            you in their ordered list at all. Getting past 70 is the single
            thing that changes most.
          </p>
        ) : (
          <p className="ready-floor">
            You are above the 70% a school&apos;s ranking needs, so you appear in
            their ordered list.
          </p>
        )}
      </div>
    </div>
  );
}

import type { TeacherSummary } from "@/lib/dashboard-data";

/** Written in full here rather than stored, so the reason travels with the warning. */
const WHY: Record<string, string> = {
  document_expiring:
    "Most work permits need six months of passport validity left on the start date. With an offer open, this is the thing most likely to cost you the job.",
  document_rejected:
    "A school cannot verify you until this is readable. It is not a judgement about you — the scan was unusable.",
  document_missing:
    "Not urgent yet. Schools ask for it late in the process, and starting early means it is not the thing holding up an offer.",
  documents_missing:
    "Schools filter on verified paperwork. Each one you upload widens the set of roles that can consider you.",
  reference_wrong_relationship:
    "Schools weigh a reference from someone who managed you far more heavily than one from a peer. A peer reference rarely counts towards safeguarding.",
  profile_incomplete:
    "Below 70% you are excluded from ranked lists entirely, so schools never see you ordered against other candidates.",
};

/**
 * Zone 3. Each blocker says what, and then why.
 *
 * "Passport expires in 42 days" is useless on its own to someone who does not
 * know the six-month permit rule. The consequence is the content.
 */
export function Blockers({ summary }: { summary: TeacherSummary }) {
  if (!summary.blockers.length) {
    return (
      <section className="dash-section">
        <div className="dash-head"><h2>Nothing is blocking you</h2></div>
        <p className="queue-clear">
          Documents and references are in order. Nothing here needs you today.
        </p>
      </section>
    );
  }

  return (
    <section className="dash-section" aria-labelledby="blockers">
      <div className="dash-head">
        <h2 id="blockers">What&apos;s blocking you</h2>
        <span className="readout">{summary.blockers.length} items</span>
      </div>

      <ul className="panel panel-rows blockers">
        {summary.blockers.map((b) => (
          <li key={b.entityId + b.kind} className="blocker" data-severity={b.severity}>
            <span className={`chip chip-${sev(b.severity)} blocker-sev`}>
              <span className="dot" style={{ background: "currentColor" }} />
              {b.severity === "critical" ? "Act now" : b.severity === "warning" ? "Soon" : "When you can"}
            </span>
            <span className="blocker-body">
              <strong>{b.label}</strong>
              <span>{WHY[b.kind] ?? ""}</span>
            </span>
            <button type="button"
                    className={`btn ${b.severity === "critical" ? "btn-accent" : "btn-quiet"}`}>
              {b.actionLabel}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

const sev = (s: string) => (s === "critical" ? "critical" : s === "warning" ? "caution" : "neutral");

"use client";

import { useState } from "react";
import { useFlip } from "@/lib/use-flip";
import type { Shortlist as Data } from "@/lib/dashboard-data";

/**
 * Zone 4. The ranked list, with the reasoning visible on every row.
 *
 * The explanation is derived, never stored prose: each row shows the note for
 * the two highest-weighted criteria of this posting, read as a reason at >=70,
 * a concern below 55, and stated flatly in between. Change the priorities and
 * the sentences change with them.
 *
 * Ranking can be switched off, and then the list is ordered by how long people
 * have waited instead — which is the honest fallback, not an arbitrary one.
 *
 * Candidates below the profile threshold are never scored 0. They sit in their
 * own group, with the reason, because a missing profile is not a weak one.
 */
export function Shortlist({
  data, canEditCriteria, canSeeDocuments,
}: { data: Data; canEditCriteria: boolean; canSeeDocuments: boolean }) {
  const [ranked, setRanked] = useState(true);

  /* The shortlist is one set of people, shown in two orders. Slicing after
     sorting — which is what this did — meant turning ranking off swapped in a
     different eight candidates, so the control was quietly filtering rather
     than ordering. The brief rules that out, and animating it is what exposed
     it: only one row ever had somewhere to travel to.

     The visible set is fixed by the ranking, then reordered in place. */
  const SHOWN = 8;
  const visible = data.ranked.slice(0, SHOWN);
  const byWait = [...visible].sort((a, b) => b.appliedDaysAgo - a.appliedDaysAgo);
  const list = ranked ? visible : byWait;

  // Rows travel to their new places rather than blinking into them.
  const listRef = useFlip<HTMLOListElement>(ranked);

  return (
    <section className="dash-section" aria-labelledby="shortlist">
      <div className="dash-head">
        <h2 id="shortlist">Shortlist · {data.posting.title}</h2>
        <p>
          {data.posting.applicationCount} applications.{" "}
          {ranked
            ? "Ranked against this posting's priorities."
            : "Ranking off — the same candidates, ordered by how long each has waited."}
        </p>
        <button type="button" className="btn btn-quiet" aria-pressed={ranked}
                onClick={() => setRanked((v) => !v)}>
          {ranked ? "Turn ranking off" : "Turn ranking on"}
        </button>
      </div>

      {ranked && (
        <div className="sl-criteria">
          <span className="label">Priorities</span>
          <ol className="sl-criteria-list">
            {data.criteria.map((c, i) => (
              <li key={c.id} className={i < 2 ? "is-top" : undefined}>
                <span className="num">{Math.round(c.weight * 100)}%</span>
                <span>{c.label}</span>
              </li>
            ))}
          </ol>
          {canEditCriteria
            ? <button type="button" className="btn btn-quiet">Change priorities</button>
            : <span className="readout sl-readonly">View only</span>}
        </div>
      )}

      <p className="sl-disclaimer">
        <strong>The ranking orders this list. It does not decide anything.</strong>{" "}
        Nobody is filtered out, rejected or hidden by a score — a person makes
        every call.
      </p>

      <ol className="panel panel-rows sl-list" ref={listRef}>
        {list.map((c, i) => (
          <li key={c.id} className="sl-row" data-flip-key={c.id}>
            <span className="sl-rank num">{ranked ? i + 1 : "—"}</span>

            <span className="sl-who">
              <span className="sl-name">{c.name}</span>
              <span className="sl-headline">{c.headline}</span>
              <span className="readout">{c.location} · applied {c.appliedDaysAgo}d ago</span>
            </span>

            <ul className="sl-reasons">
              {c.reasons.map((r) => (
                <li key={r.label} data-tone={r.tone}>
                  <span className="readout">{r.label}</span>
                  <span className="sl-note">{r.note}</span>
                </li>
              ))}
            </ul>

            <span className="sl-right">
              <span className="sl-score" data-on={ranked || undefined} aria-hidden={!ranked}>
                <span className="fig sl-score-fig">{c.score}</span>
                <span className="readout">score</span>
              </span>
              <span className={`chip ${c.owed ? "chip-critical" : "chip-neutral"}`}>
                {c.owed ? "Owes reply" : c.stage}
              </span>
            </span>
          </li>
        ))}
      </ol>

      {data.notRankable.length > 0 && (
        <div className="sl-unrankable">
          <h3>Not yet rankable · {data.notRankable.length}</h3>
          <p>
            These profiles are below the {70}% completeness the ranking needs, so
            they carry no score. They are candidates, not zeros — the gap is in
            the profile, not the person.
          </p>
          <ul className="sl-unrankable-list">
            {data.notRankable.map((c) => (
              <li key={c.id}>
                <span className="sl-name">{c.name}</span>
                <span className="bar sl-completeness" role="img"
                      aria-label={`Profile ${c.completeness}% complete`}>
                  <span style={{ width: `${c.completeness}%`, background: "var(--stage-screening)" }} />
                </span>
                <span className="readout num">{c.completeness}% complete</span>
                {/* Chasing a profile means seeing which documents are missing,
                    which is view_documents. Without it the row states the
                    position and stops there. */}
                {canSeeDocuments && (
                  <button type="button" className="btn btn-quiet">Ask for the rest</button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

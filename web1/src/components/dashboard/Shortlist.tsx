"use client";

import Link from "next/link";
import { useState } from "react";
import { useFlip } from "@/lib/use-flip";
import type { ShortlistSummary } from "@/lib/dashboard-data";

/**
 * The ranked list, with the reasoning visible on every row.
 *
 * The explanation is derived, never stored prose: each row shows the note for
 * the two highest-weighted criteria of this posting, read as a reason at >=70,
 * a concern below 55, and stated flatly in between. Change the priorities and
 * the sentences change with them.
 *
 * Five rows, not the whole list. The dashboard is a triage surface — the point
 * is who is at the top of each posting, and the full lists have their own page.
 * The row under the five is a real continuation, showing who comes next, so
 * the cut reads as "more of this" rather than as the end.
 */
export function Shortlist({
  summaries, canEditCriteria,
}: {
  summaries: ShortlistSummary[];
  canEditCriteria: boolean;
}) {
  const [postingId, setPostingId] = useState(summaries[0]?.posting.id ?? "");
  const [ranked, setRanked] = useState(true);

  const data = summaries.find((s) => s.posting.id === postingId) ?? summaries[0];
  // Rows travel to their new places rather than blinking into them. Keyed on
  // both switches so a posting change settles the same way a reorder does.
  const listRef = useFlip<HTMLOListElement>(`${postingId}:${ranked}`);

  if (!data) return null;

  const list = ranked ? data.top : data.topByWait;
  const remaining = data.rankableCount - data.top.length;
  const rankingOn = ranked && data.posting.aiRankingEnabled;

  return (
    <section className="dash-section shortlist-zone" aria-labelledby="shortlist">
      <div className="dash-head">
        <h2 id="shortlist">
          Shortlist
          <span className="sl-sep" aria-hidden="true">·</span>
          <span className="sl-picker">
            <select value={postingId} onChange={(e) => setPostingId(e.target.value)}
                    aria-label="Which posting's shortlist to show">
              {summaries.map((s) => (
                <option key={s.posting.id} value={s.posting.id}>
                  {s.posting.title} ({s.posting.applicationCount})
                </option>
              ))}
            </select>
            <span className="sl-picker-caret" aria-hidden="true">
              <svg width="11" height="7" viewBox="0 0 11 7" fill="none">
                <path d="M1 1.2 5.5 5.6 10 1.2" stroke="currentColor" strokeWidth="1.6"
                      strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </span>
        </h2>
        <p>
          {data.posting.applicationCount} applications.{" "}
          {!data.posting.aiRankingEnabled
            ? "Ranking is off for this posting."
            : ranked
              ? "Top five against this posting's priorities."
              : "Ranking off — the same five, ordered by how long each has waited."}
        </p>
        {/* Both controls act on the ranking, so they sit together. "Change
            priorities" used to be stapled to the end of the criteria pills,
            where it read as another criterion rather than as a control, and
            it made the strip's right edge ragged.
            Kept visible while ranking is merely switched off, so toggling
            does not make the header jump. */}
        {data.posting.aiRankingEnabled && (
          <div className="sl-actions">
            <button type="button" className="btn btn-quiet" aria-pressed={ranked}
                    onClick={() => setRanked((v) => !v)}>
              {ranked ? "Turn ranking off" : "Turn ranking on"}
            </button>
            {canEditCriteria
              ? <button type="button" className="btn btn-quiet">Change priorities</button>
              : <span className="readout sl-readonly">Priorities are view-only</span>}
          </div>
        )}
      </div>

      {rankingOn && (
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
            <span className="sl-rank num">{rankingOn ? i + 1 : "—"}</span>

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
              <span className="sl-score" data-on={rankingOn || undefined} aria-hidden={!rankingOn}>
                <span className="fig sl-score-fig">{c.score}</span>
                <span className="readout">score</span>
              </span>
              <span className={`chip ${c.owed ? "chip-critical" : "chip-neutral"}`}>
                {c.owed ? "Owes reply" : c.stage}
              </span>
            </span>
          </li>
        ))}

        {/* Not a button pretending to be a row: a real continuation of the
            list, naming who comes next, so the cut reads as more of the same. */}
        {remaining > 0 && (
          <li className="sl-more-row">
            <Link href={`/dashboard/shortlists?posting=${data.posting.id}`} className="sl-more">
              <span className="sl-more-n num">+{remaining}</span>
              <span className="sl-more-body">
                <span>more ranked candidates</span>
                {data.peek.length > 0 && (
                  <span className="sl-more-peek readout">
                    next: {data.peek.join(" · ")}
                  </span>
                )}
              </span>
              <span className="sl-more-go readout" aria-hidden="true">Open the full list &rarr;</span>
            </Link>
          </li>
        )}
      </ol>

      {data.notRankableCount > 0 && (
        <p className="sl-unrankable-note">
          <Link href={`/dashboard/shortlists?posting=${data.posting.id}`}>
            {data.notRankableCount} more {data.notRankableCount === 1 ? "candidate is" : "candidates are"} below
            the 70% completeness the ranking needs
          </Link>{" "}
          — they carry no score and are listed separately, never as zeros.
        </p>
      )}
    </section>
  );
}

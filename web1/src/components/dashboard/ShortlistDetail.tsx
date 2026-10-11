"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useFlip } from "@/lib/use-flip";
import type { Shortlist } from "@/lib/dashboard-data";

const PER_PAGE = 10;

/**
 * One posting's whole list, paged.
 *
 * Ten at a time rather than all 35: a recruiter works through a shortlist in
 * sittings, and a page that ends is easier to resume than one that scrolls.
 * The count stays visible so the length is never a surprise.
 *
 * Turning ranking off reorders the same people by how long each has waited —
 * across the whole list, not the page, so the order is a property of the
 * shortlist rather than of where you happen to be in it.
 */
export function ShortlistDetail({
  data, canEditCriteria, canSeeDocuments,
}: {
  data: Shortlist;
  canEditCriteria: boolean;
  canSeeDocuments: boolean;
}) {
  const [ranked, setRanked] = useState(true);
  const [page, setPage] = useState(0);
  /* Which way the last move went, so the page that arrives comes from the
     side it was reached from. A page that always enters the same way says
     nothing about whether you went forward or back. */
  const [dir, setDir] = useState<"fwd" | "back">("fwd");

  const goTo = (next: number) => {
    setDir(next > page ? "fwd" : "back");
    setPage(next);
  };

  // A new posting is a new list; staying on page 4 of the old one is wrong.
  useEffect(() => { setPage(0); setDir("fwd"); }, [data.posting.id]);

  const ordered = ranked
    ? data.ranked
    : [...data.ranked].sort((a, b) => b.appliedDaysAgo - a.appliedDaysAgo);

  const pages = Math.max(1, Math.ceil(ordered.length / PER_PAGE));
  const current = Math.min(page, pages - 1);
  const from = current * PER_PAGE;
  const slice = ordered.slice(from, from + PER_PAGE);

  const listRef = useFlip<HTMLOListElement>(`${data.posting.id}:${ranked}`);

  const live = data.ranked.length + data.notRankable.length;
  const closedTotal = data.closed.rejected + data.closed.withdrawn + data.closed.hired;
  const closedWords = [
    data.closed.rejected && `${data.closed.rejected} rejected`,
    data.closed.withdrawn && `${data.closed.withdrawn} withdrew`,
    data.closed.hired && `${data.closed.hired} hired`,
  ].filter(Boolean).join(", ");

  return (
    <div className="slp-detail">
      <div className="dash-head">
        <h3>{data.posting.title}</h3>
        <p>
          {ranked
            ? "Ranked against this posting's priorities."
            : "Ranking off — the same candidates, ordered by how long each has waited."}
          {" "}
          <span className="slp-reconcile">
            {live} of {data.posting.applicationCount} applications are still live
            {closedTotal > 0 && <> — {closedWords} and {closedTotal === 1 ? "is" : "are"} not listed</>}.
          </span>
        </p>
        {/* Same pairing as the dashboard: the two ranking controls together,
            outside the criteria strip. */}
        <div className="sl-actions">
          <button type="button" className="btn btn-quiet" aria-pressed={ranked}
                  onClick={() => setRanked((v) => !v)}>
            {ranked ? "Turn ranking off" : "Turn ranking on"}
          </button>
          {canEditCriteria
            ? <button type="button" className="btn btn-quiet">Change priorities</button>
            : <span className="readout sl-readonly">Priorities are view-only</span>}
        </div>
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
        </div>
      )}

      {/* Keyed on the page so the list remounts and plays its entrance. The
          ranking toggle leaves the key alone, so that one still runs through
          FLIP — the same people moving, rather than a new page arriving. */}
      <ol className="panel panel-rows sl-list" ref={listRef}
          key={current} data-dir={dir}>
        {slice.map((c, i) => (
          <li key={c.id} className="sl-row" data-flip-key={c.id}>
            <span className="sl-rank num">{ranked ? from + i + 1 : "—"}</span>
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

      {pages > 1 && (
        <nav className="slp-pager" aria-label="Shortlist pages">
          <button type="button" className="btn btn-quiet" disabled={current === 0}
                  onClick={() => goTo(current - 1)}>Previous</button>
          <span className="readout num">
            {from + 1}&ndash;{Math.min(from + PER_PAGE, ordered.length)} of {ordered.length}
          </span>
          {/* A rail of page-wide segments rather than a row of dots. Dots at
              this count sat close enough to read as a rendering fault, and
              they said nothing about how far through the list you were. */}
          <span className="slp-rail" aria-hidden="true">
            {Array.from({ length: pages }, (_, i) => (
              <button key={i} type="button" className="slp-seg" data-on={i === current || undefined}
                      onClick={() => goTo(i)} tabIndex={-1} />
            ))}
          </span>
          <button type="button" className="btn btn-quiet" disabled={current === pages - 1}
                  onClick={() => goTo(current + 1)}>Next</button>
        </nav>
      )}

      {data.notRankable.length > 0 && (
        <div className="sl-unrankable sl-unrankable-page">
          <h3>Not yet rankable · {data.notRankable.length}</h3>
          <p>
            These profiles are below the 70% completeness the ranking needs, so
            they carry no score. They are candidates, not zeros — the gap is in
            the profile, not the person.
          </p>
          <ul className="sl-unrankable-grid">
            {data.notRankable.map((c) => (
              <li key={c.id}>
                <span className="sl-name">{c.name}</span>
                <span className="bar sl-completeness" data-grow role="img"
                      aria-label={`Profile ${c.completeness}% complete`}>
                  <span style={{ width: `${c.completeness}%`,
                                 background: "var(--stage-screening)" }} />
                </span>
                <span className="readout num">{c.completeness}% complete</span>
                {canSeeDocuments && (
                  <button type="button" className="btn btn-quiet">Ask for the rest</button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* The footer used to restate a count here, labelled "candidates on this
          posting" — but it summed only the live ones, so a posting with nine
          applications reported eight. The number now lives in the header,
          where it can say what it leaves out. */}
      <div className="slp-foot">
        <Link href="/dashboard/school" className="btn btn-quiet">
          &larr; Back to the dashboard
        </Link>
      </div>
    </div>
  );
}

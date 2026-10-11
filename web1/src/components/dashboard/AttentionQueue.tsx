"use client";

import { useState } from "react";
import type { QueueItem } from "@/lib/dashboard-data";

/**
 * Zone 2. A work queue, ordered by cost of inaction rather than recency, so a
 * candidate ignored for 45 days outranks an interview happening tomorrow.
 * The weighting lives in getQueue(); this only renders it.
 */
export function AttentionQueue({ items }: { items: QueueItem[] }) {
  const [expanded, setExpanded] = useState(false);
  const FIRST = 6;
  const shown = expanded ? items : items.slice(0, FIRST);
  const hidden = items.length - shown.length;

  if (!items.length) {
    return (
      <section className="dash-section">
        <div className="dash-head"><h2>Needs your attention</h2></div>
        <p className="queue-clear">Nobody is waiting on a reply. Nothing here needs you today.</p>
      </section>
    );
  }

  return (
    <section className="dash-section" aria-labelledby="queue">
      <div className="dash-head">
        <h2 id="queue">Needs your attention</h2>
        <p>
          Ordered by what the delay costs, not by how long it has been. Someone
          already in screening has invested more and is likelier to walk, so the
          same wait counts for more there than at applied.
        </p>
        <span className="readout">{items.length} items</span>
      </div>

      <ol className="panel panel-rows queue">
        {shown.map((i, idx) => (
          <li key={i.key} className="queue-row" data-severity={i.severity}
              /* Only the rows revealed by "show more" animate in. The first
                 six are present at first paint and have nothing to arrive
                 from. */
              data-entering={expanded && idx >= FIRST ? "" : undefined}>
            <span className="queue-days num" aria-label={`${i.days} days`}>
              <strong>{i.days}</strong><span className="readout">d</span>
            </span>
            <span className="queue-body">
              <span className="queue-who">{i.who}</span>
              <span className="queue-what">{i.what}</span>
              <span className="queue-context readout">
                {i.context}
                {i.boost && <span className="queue-boost">{i.boost}</span>}
              </span>
            </span>
            <button type="button" className="btn btn-quiet queue-action">{i.action}</button>
          </li>
        ))}
      </ol>

      {hidden > 0 && (
        <button type="button" className="btn btn-quiet queue-more"
                onClick={() => setExpanded(true)}>
          Show {hidden} more
        </button>
      )}
      {expanded && items.length > FIRST && (
        <button type="button" className="btn btn-quiet queue-more"
                onClick={() => setExpanded(false)}>
          Collapse
        </button>
      )}
    </section>
  );
}

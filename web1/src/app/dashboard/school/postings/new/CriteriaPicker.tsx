"use client";

import { useState } from "react";
import { MAX_CRITERIA, MIN_CRITERIA, criterionWeights } from "@/lib/posting-fields";

export type CriterionOption = {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
  measuredFrom: string;
};

/**
 * The ranking criteria, in order — the one screen in this product that is not
 * like everybody else's.
 *
 * Position IS the weight. A recruiter picking the same five criteria in a
 * different order gets a different shortlist, and that is the point, so the
 * percentage each position carries is shown and updates as they move things.
 * Without it the ordering looks decorative, and somebody will spend a week
 * wondering why their list never changes.
 *
 * Buttons rather than drag-and-drop: this has to work with a keyboard, and a
 * list of five does not need a gesture.
 */
export function CriteriaPicker({
  options,
  problem,
}: {
  options: CriterionOption[];
  problem?: string;
}) {
  const [chosen, setChosen] = useState<string[]>([]);

  const weights = criterionWeights(chosen.length);
  const byId = new Map(options.map((o) => [o.id, o]));
  const available = options.filter((o) => !chosen.includes(o.id));
  const full = chosen.length >= MAX_CRITERIA;

  const move = (from: number, to: number) => {
    if (to < 0 || to >= chosen.length) return;
    const next = [...chosen];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setChosen(next);
  };

  return (
    <div className="cp">
      {chosen.map((id, i) => (
        <input key={`v-${id}`} type="hidden" name="rankingCriteria" value={id} />
      ))}

      <div className="cp-chosen">
        <div className="cp-head">
          <strong>What matters, in order</strong>
          <span className="readout">
            {chosen.length === 0
              ? `pick ${MIN_CRITERIA} to ${MAX_CRITERIA}`
              : `${chosen.length} of ${MAX_CRITERIA}`}
          </span>
        </div>

        {chosen.length === 0 ? (
          <p className="su-note">
            Nothing picked yet. The first one you choose carries the most
            weight — with five criteria the top one is worth five times the
            bottom one, so the order is a real decision, not a tidy-up.
          </p>
        ) : (
          <ol className="cp-list">
            {chosen.map((id, i) => {
              const o = byId.get(id);
              if (!o) return null;
              return (
                <li key={id}>
                  <span className="cp-weight">{weights[i]}%</span>
                  <span className="cp-body">
                    <strong>{o.label}</strong>
                    <span className="readout">{o.measuredFrom}</span>
                  </span>
                  <span className="cp-moves">
                    <button
                      type="button"
                      onClick={() => move(i, i - 1)}
                      disabled={i === 0}
                      aria-label={`Move ${o.label} up`}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => move(i, i + 1)}
                      disabled={i === chosen.length - 1}
                      aria-label={`Move ${o.label} down`}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => setChosen(chosen.filter((c) => c !== id))}
                      aria-label={`Remove ${o.label}`}
                    >
                      ×
                    </button>
                  </span>
                </li>
              );
            })}
          </ol>
        )}

        {chosen.length > 0 && chosen.length < MIN_CRITERIA && (
          <p className="su-bad">
            {MIN_CRITERIA - chosen.length} more to go — fewer than{" "}
            {MIN_CRITERIA} and the top one drowns out everything else.
          </p>
        )}
        {problem && <p className="su-bad">{problem}</p>}
      </div>

      <div className="cp-available">
        <div className="cp-head">
          <strong>Everything we can measure</strong>
          <span className="readout">{available.length} left</span>
        </div>
        <ul className="cp-list cp-offer">
          {available.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                onClick={() => setChosen([...chosen, o.id])}
                disabled={full}
                title={full ? `${MAX_CRITERIA} is the most you can weigh at once` : undefined}
              >
                <strong>{o.label}</strong>
                <span>{o.description}</span>
              </button>
            </li>
          ))}
        </ul>
        {full && (
          <p className="readout">
            {MAX_CRITERIA} is the most. Remove one to swap it for another — and
            you can reorder them later without reposting.
          </p>
        )}
      </div>
    </div>
  );
}

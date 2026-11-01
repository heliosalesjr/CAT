"use client";

import { useActionState, useState } from "react";
import { moveStageAction, type MoveState } from "./actions";

type Row = {
  applicationId: string;
  candidateName: string;
  headline: string | null;
  stage: string;
  profileCompleteness: number;
  yearsExperience: number;
  rankable: boolean;
  notRankableReason: string | null;
  aiRankScore: number | null;
  schoolOwesResponse: boolean;
};

/** One step forward, or out. 0005 refuses anything else. */
const NEXT: Record<string, string | null> = {
  applied: "screening",
  screening: "interview",
  interview: "offer",
  offer: "hired",
  hired: null,
  rejected: null,
  withdrawn: null,
};

const STAGE_LABEL: Record<string, string> = {
  applied: "Applied", screening: "Screening", interview: "Interview",
  offer: "Offer", hired: "Hired", rejected: "Ended", withdrawn: "Withdrawn",
};

/**
 * The pipeline for one role.
 *
 * Two things this screen says that the schema enforces and a recruiter would
 * otherwise have to be told twice. Rule 6: somebody below the threshold is
 * not scored low, they are held out of the ordering and shown separately —
 * never dropped. And rule 7: ranking changes order and nothing else, so every
 * candidate here has the same two buttons whatever their score.
 */
export function Pipeline({ rows, canMove }: { rows: Row[]; canMove: boolean }) {
  const [state, action, pending] = useActionState<MoveState, FormData>(moveStageAction, null);
  const [ending, setEnding] = useState<string | null>(null);

  if (!rows.length) {
    return (
      <section className="dash-section">
        <p className="queue-clear">
          Nobody has applied yet. Nothing is wrong — a role reaches candidates
          through their own searches, and that takes a few days.
        </p>
      </section>
    );
  }

  const ranked = rows.filter((r) => r.rankable);
  const waiting = rows.filter((r) => !r.rankable);
  const shared = { action, pending, canMove, ending, setEnding };

  return (
    <>
      {state && (
        <section className="dash-section" style={{ paddingBottom: 0 }}>
          <p className="note" data-bad={"ok" in state ? undefined : true} role="status">
            {"ok" in state ? state.ok : state.error}
          </p>
        </section>
      )}

      {ranked.length > 0 && (
        <section className="dash-section" aria-labelledby="in-order">
          <div className="dash-head">
            <h2 id="in-order">In order</h2>
            <p>
              Ranking changes the order and nothing else — it never rejects,
              filters or hides anybody. Everyone here has the same two buttons
              whatever their score.
            </p>
            <span className="readout">{ranked.length}</span>
          </div>
          <Group rows={ranked} {...shared} />
        </section>
      )}

      {waiting.length > 0 && (
        <section className="dash-section" aria-labelledby="not-ordered">
          <div className="dash-head">
            <h2 id="not-ordered">Not yet ordered</h2>
            <p>
              These are not scored low — they are held out of the ordering
              until there is something to order them by. Nobody is hidden, and
              you can move any of them exactly as you would the rest.
            </p>
            <span className="readout">{waiting.length}</span>
          </div>
          <Group rows={waiting} {...shared} />
        </section>
      )}
    </>
  );
}

function Group({
  rows,
  action,
  pending,
  canMove,
  ending,
  setEnding,
}: {
  rows: Row[];
  action: (f: FormData) => void;
  pending: boolean;
  canMove: boolean;
  ending: string | null;
  setEnding: (id: string | null) => void;
}) {
  return (
    <div className="panel panel-rows">
      {rows.map((r) => {
        const next = NEXT[r.stage];
        const closed = r.stage === "rejected" || r.stage === "withdrawn" || r.stage === "hired";
        const scored = r.rankable && r.aiRankScore !== null;
        return (
          <article key={r.applicationId} className="cand-row"
                   data-owed={r.schoolOwesResponse || undefined}
                   data-closed={closed || undefined}>
            <span className="cand-score" data-unranked={scored ? undefined : true}>
              <b>{scored ? r.aiRankScore : "—"}</b>
              <span className="readout">{scored ? "score" : "unscored"}</span>
            </span>

            <div className="cand-body">
              <span className="cand-who">
                {r.candidateName}
                <span className={`chip chip-${closed ? "neutral" : "outline"}`}>
                  {STAGE_LABEL[r.stage] ?? r.stage}
                </span>
                {r.schoolOwesResponse && (
                  <span className="chip chip-caution">owes an answer</span>
                )}
              </span>
              {r.headline && <p className="cand-headline">{r.headline}</p>}

              <dl className="cand-facts">
                <div>
                  <dt className="readout">Experience</dt>
                  <dd className="num">{r.yearsExperience} years</dd>
                </div>
                <div>
                  <dt className="readout">Profile</dt>
                  <dd className="num">{r.profileCompleteness}% complete</dd>
                </div>
                {/* Only when there is no score. The column already carries
                    the number, and repeating it here read as two different
                    figures that happened to match. What is worth a fact is
                    the REASON there is none, because one of the two is
                    something the candidate can fix and the other is not. */}
                {!scored && (
                  <div>
                    <dt className="readout">Why unscored</dt>
                    <dd>
                      {r.notRankableReason === "awaiting_ranking"
                        ? "not scored yet — nothing they can do"
                        : "profile below the threshold"}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {canMove && !closed ? (
              <div className="cand-act">
                {next && (
                  <form action={action}>
                    <input type="hidden" name="applicationId" value={r.applicationId} />
                    <input type="hidden" name="who" value={r.candidateName} />
                    <input type="hidden" name="to" value={next} />
                    <button className="btn btn-accent" type="submit" disabled={pending}>
                      Move to {STAGE_LABEL[next]?.toLowerCase() ?? next}
                    </button>
                  </form>
                )}
                {ending === r.applicationId ? (
                  <form action={action} className="cand-end">
                    <input type="hidden" name="applicationId" value={r.applicationId} />
                    <input type="hidden" name="who" value={r.candidateName} />
                    <input type="hidden" name="to" value="rejected" />
                    <input
                      name="reason"
                      placeholder="Why — they are told this"
                      required
                      autoFocus
                    />
                    <button className="btn btn-quiet" type="submit" disabled={pending}>
                      Send it
                    </button>
                  </form>
                ) : (
                  <button
                    type="button"
                    className="btn btn-quiet"
                    onClick={() => setEnding(r.applicationId)}
                  >
                    End it
                  </button>
                )}
              </div>
            ) : closed ? (
              <p className="readout cand-closed">
                Closed. A terminal stage is terminal.
              </p>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

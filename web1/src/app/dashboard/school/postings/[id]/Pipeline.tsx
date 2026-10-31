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
    return <p className="queue-clear">Nobody has applied yet.</p>;
  }

  const ranked = rows.filter((r) => r.rankable);
  const waiting = rows.filter((r) => !r.rankable);

  return (
    <>
      {state && (
        <p className={"ok" in state ? "su-note" : "su-error"} role="status">
          {"ok" in state ? state.ok : state.error}
        </p>
      )}

      {ranked.length > 0 && <Group rows={ranked} {...{ action, pending, canMove, ending, setEnding }} />}

      {waiting.length > 0 && (
        <>
          <h3 className="title" style={{ marginTop: 24 }}>
            Not yet ordered
          </h3>
          <p className="body measure">
            These are not scored low — they are held out of the ordering until
            there is something to order them by. Nobody is hidden, and you can
            move any of them exactly as you would the rest.
          </p>
          <Group rows={waiting} {...{ action, pending, canMove, ending, setEnding }} />
        </>
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
    <div className="aq-list">
      {rows.map((r) => {
        const next = NEXT[r.stage];
        const closed = r.stage === "rejected" || r.stage === "withdrawn" || r.stage === "hired";
        return (
          <div key={r.applicationId} className="aq-card">
            <div className="aq-head">
              <strong>{r.candidateName}</strong>
              <span className="readout">
                {r.stage}
                {r.schoolOwesResponse && " · you owe them an answer"}
              </span>
            </div>
            {r.headline && <p className="body">{r.headline}</p>}

            <dl className="aq-facts">
              <dt className="readout">Experience</dt>
              <dd>{r.yearsExperience} years</dd>
              <dt className="readout">Profile</dt>
              <dd>{r.profileCompleteness}% complete</dd>
              <dt className="readout">Rank</dt>
              <dd>
                {r.rankable && r.aiRankScore !== null
                  ? r.aiRankScore
                  : r.notRankableReason === "awaiting_ranking"
                    ? "not scored yet"
                    : "below the ranking threshold"}
              </dd>
            </dl>

            {canMove && !closed && (
              <div className="aq-act">
                {next && (
                  <form action={action}>
                    <input type="hidden" name="applicationId" value={r.applicationId} />
                    <input type="hidden" name="who" value={r.candidateName} />
                    <input type="hidden" name="to" value={next} />
                    <button className="su-btn" type="submit" disabled={pending}>
                      Move to {next}
                    </button>
                  </form>
                )}
                {ending === r.applicationId ? (
                  <form action={action} className="aq-end">
                    <input type="hidden" name="applicationId" value={r.applicationId} />
                    <input type="hidden" name="who" value={r.candidateName} />
                    <input type="hidden" name="to" value="rejected" />
                    <input
                      name="reason"
                      placeholder="Why — they are told this"
                      required
                      autoFocus
                    />
                    <button className="su-btn su-btn-quiet" type="submit" disabled={pending}>
                      Send it
                    </button>
                  </form>
                ) : (
                  <button
                    type="button"
                    className="su-btn su-btn-quiet"
                    onClick={() => setEnding(r.applicationId)}
                  >
                    End it
                  </button>
                )}
              </div>
            )}
            {closed && (
              <p className="readout">
                This application is closed. A terminal stage is terminal.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

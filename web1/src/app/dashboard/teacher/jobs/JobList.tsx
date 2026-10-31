"use client";

import { useActionState } from "react";
import { applyAction, type ApplyState } from "./actions";

type Job = {
  id: string;
  title: string;
  schoolName: string;
  where: string;
  roleFamily: string;
  subjects: string[];
  specialisms: string[];
  salary: string | null;
  startDate: string | null;
  applyBy: string | null;
  blocked: string | null;
};

/**
 * Roles a candidate can see, with the reason they cannot apply shown instead
 * of the button when there is one.
 *
 * Never a disabled button with no explanation. A work-permit exclusion in
 * particular is about the school's paperwork and not about the person, and
 * saying so is the difference between this product and the thing it replaces.
 */
export function JobList({ jobs }: { jobs: Job[] }) {
  const [state, action, pending] = useActionState<ApplyState, FormData>(applyAction, null);

  if (!jobs.length) {
    return (
      <p className="queue-clear">
        No roles are open right now. A school has to be verified before its
        roles go live, so this fills up as schools come through.
      </p>
    );
  }

  return (
    <>
      {state && (
        <p className={"ok" in state ? "su-note" : "su-error"} role="status">
          {"ok" in state ? state.ok : state.error}
        </p>
      )}

      <div className="aq-list">
        {jobs.map((j) => (
          <form key={j.id} action={action} className="aq-card">
            <input type="hidden" name="postingId" value={j.id} />
            <input type="hidden" name="title" value={j.title} />

            <div className="aq-head">
              <strong>{j.title}</strong>
              <span className="readout">
                {j.schoolName}
                {j.where && ` · ${j.where}`}
              </span>
            </div>

            <dl className="aq-facts">
              {j.subjects.length > 0 && (
                <>
                  <dt className="readout">Subjects</dt>
                  <dd>{j.subjects.join(", ")}</dd>
                </>
              )}
              {j.specialisms.length > 0 && (
                <>
                  <dt className="readout">Specialism</dt>
                  <dd>{j.specialisms.join(", ")}</dd>
                </>
              )}
              {j.salary && (
                <>
                  <dt className="readout">Salary</dt>
                  <dd>{j.salary}</dd>
                </>
              )}
              {j.startDate && (
                <>
                  <dt className="readout">Starts</dt>
                  <dd>{j.startDate}</dd>
                </>
              )}
              {j.applyBy && (
                <>
                  <dt className="readout">Closes</dt>
                  <dd>{j.applyBy}</dd>
                </>
              )}
            </dl>

            {j.blocked ? (
              <p className="su-note">{j.blocked}</p>
            ) : (
              <div className="aq-act">
                <button className="su-btn" type="submit" disabled={pending}>
                  {pending ? "Applying…" : "Apply"}
                </button>
                <label className="pf-bool">
                  <input type="checkbox" name="coverLetter" />
                  <span>I am attaching a cover letter</span>
                </label>
              </div>
            )}
          </form>
        ))}
      </div>
    </>
  );
}

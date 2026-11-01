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
        <p className="note" data-bad={"ok" in state ? undefined : true} role="status">
          {"ok" in state ? state.ok : state.error}
        </p>
      )}

      <div className="panel panel-rows">
        {jobs.map((j) => (
          <form key={j.id} action={action} className="job-row"
                data-blocked={j.blocked ? true : undefined}>
            <input type="hidden" name="postingId" value={j.id} />
            <input type="hidden" name="title" value={j.title} />

            <div className="job-body">
              <span className="job-who">
                {j.title}
                <span className="chip chip-outline">
                  {j.roleFamily.replace(/_/g, " ")}
                </span>
              </span>
              <span className="job-where">
                {j.schoolName}
                {j.where && ` · ${j.where}`}
              </span>

              <dl className="cand-facts">
                <Fact label="Subjects" value={j.subjects.join(", ")} />
                <Fact label="Specialism" value={j.specialisms.join(", ")} />
                <Fact label="Salary" value={j.salary} />
                <Fact label="Starts" value={j.startDate} />
                <Fact label="Closes" value={j.applyBy} />
              </dl>
            </div>

            {/* Never a disabled button with no explanation: where the reason
                would go, the reason goes. */}
            {j.blocked ? (
              <p className="job-blocked">{j.blocked}</p>
            ) : (
              <div className="job-act">
                <button className="btn btn-accent" type="submit" disabled={pending}>
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

/** Nothing is drawn for a fact the posting did not state. */
function Fact({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <dt className="readout">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

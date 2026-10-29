"use client";

import { useActionState, useState } from "react";
import { createPostingAction, type PostingState } from "./actions";
import { CriteriaPicker, type CriterionOption } from "./CriteriaPicker";
import {
  CURRICULA,
  DIVISIONS,
  EMPLOYMENT_TYPES,
  GRADE_LEVELS,
  LIKELIHOODS,
  ROLE_FAMILIES,
} from "@/lib/posting-fields";

type Option = { id: string; label: string };

/**
 * One role, in four parts: what it is, who it is for, what it pays, and how
 * the school wants candidates ordered.
 *
 * Two things the form says out loud because the schema enforces them and a
 * silent refusal would be baffling: a teaching role needs a subject (nothing
 * can be matched without one), and a role at a school still being verified
 * can be written but not published.
 */
export function PostingForm({
  criteria,
  subjectOptions,
  specialismOptions,
  canPublish,
  rankingAllowed,
}: {
  criteria: CriterionOption[];
  subjectOptions: Option[];
  specialismOptions: Option[];
  canPublish: boolean;
  rankingAllowed: boolean;
}) {
  const [state, action, pending] = useActionState<PostingState, FormData>(
    createPostingAction,
    null,
  );
  const [roleFamily, setRoleFamily] = useState("teacher");

  const problem = (field: string) =>
    state && "problems" in state
      ? state.problems.find((p) => p.field === field)?.message
      : undefined;

  const teaching = roleFamily === "teacher";
  const support = roleFamily === "support_staff";

  return (
    <form action={action} className="np">
      <section className="dash-section">
        <div className="dash-head">
          <h2>What the role is</h2>
        </div>

        <label className="su-field" data-bad={problem("title") || undefined}>
          <span>Title</span>
          <input name="title" required maxLength={200} placeholder="DP Chemistry Teacher" />
          {problem("title") && <span className="su-bad">{problem("title")}</span>}
        </label>

        <fieldset className="np-fieldset">
          <legend className="su-field"><span>Kind of post</span></legend>
          <div className="su-families">
            {ROLE_FAMILIES.map((r) => (
              <label key={r.value} className="su-family">
                <input
                  type="radio"
                  name="roleFamily"
                  value={r.value}
                  checked={roleFamily === r.value}
                  onChange={() => setRoleFamily(r.value)}
                />
                <span>
                  <strong>{r.label}</strong>
                  <br />
                  <span>{r.blurb}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <Choices
          name="subjects"
          label={teaching ? "Subjects" : "Subjects, if any"}
          hint={
            teaching
              ? "Required. A candidate is matched on these, so a teaching role without one reaches nobody."
              : "Leave empty if this role does not teach."
          }
          options={subjectOptions}
          problem={problem("subjects")}
          filterable
        />

        {!teaching && (
          <Choices
            name="specialisms"
            label={support ? "Specialism" : "Specialism, if any"}
            hint="Counselling, learning support, library, nursing, admissions."
            options={specialismOptions}
            problem={problem("specialisms")}
          />
        )}

        <div className="su-fields two">
          <label className="su-field">
            <span>Division</span>
            <select name="division" defaultValue="">
              <option value="">Not specified</option>
              {DIVISIONS.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </label>
          <label className="su-field">
            <span>Academic year</span>
            <input name="academicYear" placeholder="2027-2028" maxLength={20} />
          </label>
        </div>

        <Choices
          name="gradeLevels"
          label="Grade levels"
          options={GRADE_LEVELS.map((g) => ({ id: g.value, label: g.label }))}
          problem={problem("gradeLevels")}
        />
        <Choices
          name="curriculumRequired"
          label="Curricula required"
          hint="Schools filter hard on this, and so does the ranking."
          options={CURRICULA.map((c) => ({ id: c.value, label: c.label }))}
          problem={problem("curriculumRequired")}
        />
      </section>

      <section className="dash-section">
        <div className="dash-head">
          <h2>Who it is for, and when</h2>
        </div>

        <div className="su-fields two">
          <label className="su-field">
            <span>Employment</span>
            <select name="employmentType" defaultValue="full_time">
              {EMPLOYMENT_TYPES.map((e) => (
                <option key={e.value} value={e.value}>{e.label}</option>
              ))}
            </select>
          </label>
          <label className="su-field">
            <span>How certain is it?</span>
            <select name="likelihood" defaultValue="definite">
              {LIKELIHOODS.map((l) => (
                <option key={l.value} value={l.value}>{l.label} — {l.blurb}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="su-fields two">
          <label className="su-field" data-bad={problem("applyByDate") || undefined}>
            <span>Applications close</span>
            <input type="date" name="applyByDate" />
            {problem("applyByDate") && <span className="su-bad">{problem("applyByDate")}</span>}
          </label>
          <label className="su-field">
            <span>Starts</span>
            <input type="date" name="startDate" />
          </label>
        </div>

        <div className="su-fields two">
          <label className="su-field">
            <span>Openings</span>
            <input type="number" name="openingsAvailable" min={1} defaultValue={1} />
          </label>
          <label className="su-field">
            <span>Contract length, years</span>
            <input type="number" name="contractLengthYears" min={1} placeholder="2" />
          </label>
        </div>

        <label className="su-field">
          <span>Minimum years of experience</span>
          <input type="number" name="minYearsExperience" min={0} defaultValue={0} />
          <span className="su-hint">
            A filter, not a ranking criterion. Set it low unless it is genuinely
            a bar.
          </span>
        </label>

        <label className="su-field">
          <span>Nationalities you cannot hire</span>
          <input name="excludedNationalities" placeholder="Separate with commas" />
          <span className="su-hint">
            Work-permit reasons only. Candidates are told before they apply,
            rather than rejected silently afterwards.
          </span>
        </label>

        <label className="pf-bool">
          <input type="checkbox" name="coverLetterRequired" />
          <span>Require a cover letter</span>
        </label>
      </section>

      <section className="dash-section">
        <div className="dash-head">
          <h2>Package</h2>
          <p>Shown as a range. It filters which candidates the role reaches.</p>
        </div>

        <div className="su-fields two">
          <label className="su-field">
            <span>Salary from, USD</span>
            <input type="number" name="salaryMinUsd" min={0} />
          </label>
          <label className="su-field" data-bad={problem("salaryMaxUsd") || undefined}>
            <span>to</span>
            <input type="number" name="salaryMaxUsd" min={0} />
            {problem("salaryMaxUsd") && <span className="su-bad">{problem("salaryMaxUsd")}</span>}
          </label>
        </div>

        <div className="su-fields two">
          <label className="su-field">
            <span>Dependents whose tuition is covered</span>
            <input type="number" name="dependentTuitionCovered" min={0} defaultValue={0} />
            <span className="su-hint">
              A number, not a yes. Candidates compare it against their own
              dependents.
            </span>
          </label>
          <label className="pf-bool" style={{ alignSelf: "end", paddingBottom: 10 }}>
            <input type="checkbox" name="housingProvided" />
            <span>Housing provided</span>
          </label>
        </div>
      </section>

      <section className="dash-section">
        <div className="dash-head">
          <h2>How candidates should be ordered</h2>
          <p>
            Ranking changes the order and nothing else — it never rejects,
            filters or hides anybody. You can reorder these later without
            reposting, and the list recomputes.
          </p>
        </div>

        <CriteriaPicker options={criteria} problem={problem("rankingCriteria")} />

        <label className="pf-bool" style={{ marginTop: 14 }}>
          <input
            type="checkbox"
            name="aiRankingEnabled"
            defaultChecked={rankingAllowed}
            disabled={!rankingAllowed}
          />
          <span>
            Order candidates by these criteria
            {!rankingAllowed && " — your plan does not include ranking"}
          </span>
        </label>
        <span className="su-hint">
          With this off, candidates arrive in the order they applied. The
          criteria are still stored, so turning it on later needs no edit.
        </span>
      </section>

      {state && "error" in state && (
        <p className="su-error" role="alert">{state.error}</p>
      )}
      {state && "problems" in state && (
        <p className="su-error" role="alert">
          {state.problems.length} field{state.problems.length > 1 ? "s need" : " needs"} a
          fix — see the notes above.
        </p>
      )}

      <section className="dash-section pf-save">
        <button
          className="btn btn-accent"
          type="submit"
          name="status"
          value="posted"
          disabled={pending || !canPublish}
          title={canPublish ? undefined : "Your school is still being verified"}
        >
          {pending ? "Working…" : "Publish the role"}
        </button>
        <button className="btn btn-quiet" type="submit" name="status" value="draft" disabled={pending}>
          Save as a draft
        </button>
        <span className="readout">
          {canPublish
            ? "Published roles are visible to candidates straight away."
            : "Drafts only until the school is verified."}
        </span>
      </section>
    </form>
  );
}

function Choices({
  name,
  label,
  hint,
  options,
  problem,
  filterable,
}: {
  name: string;
  label: string;
  hint?: string;
  options: Option[];
  problem?: string;
  filterable?: boolean;
}) {
  const [filter, setFilter] = useState("");
  const shown = filter
    ? options.filter((o) => o.label.toLowerCase().includes(filter.toLowerCase()))
    : options;

  return (
    <div className="su-field" data-bad={problem || undefined}>
      <span>{label}</span>
      {filterable && options.length > 12 && (
        <input
          className="pf-filter"
          type="search"
          placeholder={`Filter ${options.length} options`}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      )}
      <span className="pf-group" role="group" aria-label={label}>
        {shown.map((o) => (
          <label key={o.id} className="pf-opt">
            <input type="checkbox" name={name} value={o.id} />
            <span>{o.label}</span>
          </label>
        ))}
      </span>
      {problem ? <span className="su-bad">{problem}</span> : hint && <span className="su-hint">{hint}</span>}
    </div>
  );
}

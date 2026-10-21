"use client";

import { useActionState, useState } from "react";
import { Avatar } from "./Avatar";
import type { CandidateDoc, CandidateRef } from "@/lib/dashboard-data";
import {
  CURRICULA,
  DEGREES,
  GRADE_LEVELS,
  PROFILE_SECTIONS,
  ROLE_FAMILY_LABELS,
  type ProfileField,
  type ProfileSaveState,
} from "@/lib/profile-fields";

/**
 * The profile a candidate fills in, rendered from `PROFILE_SECTIONS` and
 * saved by the action the page hands in.
 *
 * Three things it deliberately does not do:
 *
 *   * It does not compute the headline completeness. That number comes from
 *     `candidate_completeness_breakdown` and is the same arithmetic the
 *     ranking uses, so the screen cannot promise what the matching denies.
 *     The per-section counts are a different claim — how much of THIS section
 *     is answered — and those it does count.
 *   * It does not know the subject vocabulary. The options are passed in from
 *     `practice_catalog`, which is what stops a profile saying "Maths" while
 *     a posting says "Mathematics".
 *   * It does not validate. The server does, and the problems come back named
 *     per field, because validating in both places is how the two drift.
 *
 * Without a `save` action it renders read-only — that is the demo path, which
 * the `?view=` switch still uses to show the product without an account.
 */

export type PracticeOption = { id: string; label: string };

type Values = Record<string, string | string[] | boolean>;

export function ProfileForm({
  profile,
  documents,
  references,
  completeness,
  hasPhoto,
  name,
  roleFamilies,
  subjectOptions,
  specialismOptions,
  save,
}: {
  profile: Record<string, unknown>;
  documents: CandidateDoc[];
  references: CandidateRef[];
  completeness: number;
  hasPhoto: boolean;
  name: string;
  roleFamilies: string[];
  subjectOptions: PracticeOption[];
  specialismOptions: PracticeOption[];
  save?: (prev: ProfileSaveState, form: FormData) => Promise<ProfileSaveState>;
}) {
  const noop = async (): Promise<ProfileSaveState> => null;
  const [state, action, pending] = useActionState<ProfileSaveState, FormData>(
    save ?? noop,
    null,
  );

  const [values, setValues] = useState<Values>(() => initial(profile));
  const [families, setFamilies] = useState<string[]>(roleFamilies);
  const [open, setOpen] = useState<string>("you");

  const set = (name: string, v: string | string[] | boolean) =>
    setValues((prev) => ({ ...prev, [name]: v }));

  const problem = (name: string) =>
    state?.status === "invalid"
      ? state.problems.find((p) => p.field === name)?.message
      : undefined;

  const shown = state?.status === "saved" ? state.completeness : completeness;
  const readOnly = !save;

  return (
    <form action={action}>
      <section className="dash-section pf-photo-row">
        <Avatar name={name} size={96} missing={!hasPhoto} />
        <div>
          <h2>Photograph</h2>
          {hasPhoto ? (
            <p>Schools see this beside your name on every shortlist.</p>
          ) : (
            <p>
              At {shown}% complete, a photograph is worth four points — schools
              see a blank square beside your name on every shortlist they open.
            </p>
          )}
          <button type="button" className="btn btn-accent" disabled>
            Upload a photo
          </button>
          <span className="readout pf-soon">Uploads are not built yet</span>
        </div>
      </section>

      {/* Decision 3's question lives at the top of the profile because it
          changes what the rest of it means: a counsellor and a DP Chemistry
          teacher are read from different fields. */}
      <section className="dash-section pf-section">
        <div className="pf-head pf-head-static">
          <span className="pf-head-main">
            <h2>What you are looking for</h2>
            <span className="pf-blurb">
              Pick everything that applies. Most international-school leaders
              still teach, and the matching expects that.
            </span>
          </span>
        </div>
        <div className="pf-clip">
          <div className="pf-group" role="group" aria-label="Kind of post">
            <input type="hidden" name="roleFamilies__sent" value="1" />
            {(["teacher", "administrator", "support_staff"] as const).map((f) => (
              <label key={f} className="pf-opt">
                <input
                  type="checkbox"
                  name="roleFamilies"
                  value={f}
                  checked={families.includes(f)}
                  disabled={readOnly}
                  onChange={(e) =>
                    setFamilies((prev) =>
                      e.target.checked ? [...prev, f] : prev.filter((x) => x !== f),
                    )
                  }
                />
                <span>{ROLE_FAMILY_LABELS[f]}</span>
              </label>
            ))}
          </div>
          {problem("roleFamilies") && (
            <p className="pf-problem">{problem("roleFamilies")}</p>
          )}
        </div>
      </section>

      {PROFILE_SECTIONS.map((s) => {
        const done = s.fields.filter((f) => isFilled(values[f.name])).length;
        const isOpen = open === s.id;
        const bad = s.fields.some((f) => problem(f.name));
        return (
          <section key={s.id} className="dash-section pf-section">
            <button
              type="button"
              className="pf-head"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? "" : s.id)}
            >
              <span className="pf-head-main">
                <h2>{s.title}</h2>
                <span className="pf-blurb">{s.blurb}</span>
              </span>
              <span className="pf-progress">
                <span className="bar pf-bar">
                  {/* scaleX rather than width: this moves on every keystroke,
                      and width would relayout the header each time. */}
                  <span
                    style={{
                      transform: `scaleX(${done / s.fields.length})`,
                      background:
                        done === s.fields.length
                          ? "var(--positive)"
                          : "var(--stage-screening)",
                    }}
                  />
                </span>
                <span className="readout num">
                  {bad ? "needs a fix" : `${done}/${s.fields.length}`}
                </span>
              </span>
            </button>

            {/* Every section stays mounted whether it is open or not, so a
                collapsed one still posts its values — the save is a patch of
                the whole form, and an unmounted section would read as a field
                the person cleared. */}
            <div className="pf-body" data-open={isOpen || undefined}>
              <div className="pf-clip">
                <div className="pf-fields">
                  {s.fields.map((f) => (
                    <FieldInput
                      key={f.name}
                      field={f}
                      value={values[f.name]}
                      onChange={(v) => set(f.name, v)}
                      problem={problem(f.name)}
                      readOnly={readOnly}
                      options={
                        f.kind === "subjects"
                          ? subjectOptions
                          : f.kind === "specialisms"
                            ? specialismOptions
                            : undefined
                      }
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>
        );
      })}

      <Documents documents={documents} />
      <References references={references} />

      <section className="dash-section pf-save">
        <button type="submit" className="btn btn-accent" disabled={readOnly || pending}>
          {pending ? "Saving…" : "Save changes"}
        </button>
        <SaveMessage state={state} readOnly={readOnly} />
      </section>
    </form>
  );
}

function SaveMessage({ state, readOnly }: { state: ProfileSaveState; readOnly: boolean }) {
  if (readOnly) return <span className="readout">Demo view — nothing is saved</span>;
  if (!state) return <span className="readout">Saved to your profile, not to a draft</span>;
  if (state.status === "saved") {
    return <span className="readout pf-ok">Saved · {state.completeness}% complete</span>;
  }
  if (state.status === "invalid") {
    return (
      <span className="pf-problem">
        {state.problems.length === 1
          ? "One field needs a fix — see the section marked above."
          : `${state.problems.length} fields need a fix — see the sections marked above.`}
      </span>
    );
  }
  return <span className="pf-problem">{state.message}</span>;
}

/* --------------------------------------------------------------- one field */

function FieldInput({
  field,
  value,
  onChange,
  problem,
  readOnly,
  options,
}: {
  field: ProfileField;
  value: string | string[] | boolean | undefined;
  onChange: (v: string | string[] | boolean) => void;
  problem?: string;
  readOnly: boolean;
  options?: PracticeOption[];
}) {
  const name = field.name as string;
  const filled = isFilled(value);

  return (
    <label className="pf-field" data-empty={!filled || undefined} data-bad={problem || undefined}>
      <span className="pf-label">
        {field.label}
        {!filled && !problem && <span className="pf-missing readout">Not answered</span>}
      </span>

      {field.kind === "bool" ? (
        <span className="pf-bool">
          <input type="hidden" name={`${name}__sent`} value="1" />
          <input
            type="checkbox"
            name={name}
            checked={value === true}
            disabled={readOnly}
            onChange={(e) => onChange(e.target.checked)}
          />
          <span>Yes</span>
        </span>
      ) : field.kind === "degree" ? (
        <select
          name={name}
          value={typeof value === "string" ? value : ""}
          disabled={readOnly}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Not answered</option>
          {DEGREES.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
      ) : field.kind === "curricula" || field.kind === "grades" ? (
        <Choices
          name={name}
          chosen={Array.isArray(value) ? value : []}
          options={(field.kind === "curricula" ? CURRICULA : GRADE_LEVELS).map((o) => ({
            id: o.value,
            label: o.label,
          }))}
          onChange={onChange}
          readOnly={readOnly}
        />
      ) : field.kind === "subjects" || field.kind === "specialisms" ? (
        <Choices
          name={name}
          chosen={Array.isArray(value) ? value : []}
          options={options ?? []}
          onChange={onChange}
          readOnly={readOnly}
          filterable
        />
      ) : field.kind === "tags" ? (
        <Tags
          name={name}
          values={Array.isArray(value) ? value : []}
          onChange={onChange}
          readOnly={readOnly}
        />
      ) : (
        <span className="pf-input-wrap">
          {field.kind === "money" && <span className="pf-prefix">$</span>}
          <input
            name={name}
            type={
              field.kind === "number" || field.kind === "money"
                ? "number"
                : field.kind === "date"
                  ? "date"
                  : "text"
            }
            min={field.kind === "number" || field.kind === "money" ? 0 : undefined}
            maxLength={field.max}
            value={typeof value === "string" ? value : ""}
            readOnly={readOnly}
            onChange={(e) => onChange(e.target.value)}
          />
        </span>
      )}

      {problem ? (
        <span className="pf-problem">{problem}</span>
      ) : (
        field.hint && <span className="pf-hint">{field.hint}</span>
      )}
    </label>
  );
}

/** A list chosen from a fixed vocabulary. Checkboxes, so nothing is typed. */
function Choices({
  name,
  chosen,
  options,
  onChange,
  readOnly,
  filterable,
}: {
  name: string;
  chosen: string[];
  options: PracticeOption[];
  onChange: (v: string[]) => void;
  readOnly: boolean;
  filterable?: boolean;
}) {
  const [filter, setFilter] = useState("");
  const shown = filter
    ? options.filter((o) => o.label.toLowerCase().includes(filter.toLowerCase()))
    : options;

  return (
    <span className="pf-choices">
      {/* Marks the field as submitted even when nothing is ticked, so clearing
          a list saves as empty instead of being read as "not sent". */}
      <input type="hidden" name={`${name}__sent`} value="1" />
      {filterable && options.length > 12 && (
        <input
          className="pf-filter"
          type="search"
          placeholder={`Filter ${options.length} options`}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          disabled={readOnly}
        />
      )}
      <span className="pf-group" role="group">
        {shown.map((o) => (
          <label key={o.id} className="pf-opt">
            <input
              type="checkbox"
              name={name}
              value={o.id}
              checked={chosen.includes(o.id)}
              disabled={readOnly}
              onChange={(e) =>
                onChange(
                  e.target.checked ? [...chosen, o.id] : chosen.filter((x) => x !== o.id),
                )
              }
            />
            <span>{o.label}</span>
          </label>
        ))}
        {/* A value the catalog no longer offers still has to submit, or saving
            an untouched profile would quietly drop it. */}
        {chosen
          .filter((c) => !options.some((o) => o.id === c))
          .map((c) => (
            <input key={c} type="hidden" name={name} value={c} />
          ))}
      </span>
    </span>
  );
}

/** A list the person types. Chips, because a comma-separated string hides
    which value is which when one of them is wrong. */
function Tags({
  name,
  values,
  onChange,
  readOnly,
}: {
  name: string;
  values: string[];
  onChange: (v: string[]) => void;
  readOnly: boolean;
}) {
  const [draft, setDraft] = useState("");

  const add = (raw: string) => {
    const next = [...values];
    for (const part of raw.split(/[,\n]/)) {
      const t = part.trim();
      if (t && !next.includes(t)) next.push(t);
    }
    onChange(next);
    setDraft("");
  };

  return (
    <span className="pf-tags">
      <input type="hidden" name={`${name}__sent`} value="1" />
      {values.map((v) => (
        <span key={v} className="pf-chip">
          <input type="hidden" name={name} value={v} />
          {v}
          {!readOnly && (
            <button
              type="button"
              aria-label={`Remove ${v}`}
              onClick={() => onChange(values.filter((x) => x !== v))}
            >
              &times;
            </button>
          )}
        </span>
      ))}
      {!readOnly && (
        <input
          className="pf-tag-input"
          value={draft}
          placeholder={values.length ? "Add another" : "Add one, then another"}
          onChange={(e) => {
            if (/[,\n]/.test(e.target.value)) add(e.target.value);
            else setDraft(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add(draft);
            }
          }}
          onBlur={() => draft.trim() && add(draft)}
        />
      )}
    </span>
  );
}

/* ----------------------------------------------------------------- values */

function initial(profile: Record<string, unknown>): Values {
  const v: Values = {};
  for (const section of PROFILE_SECTIONS) {
    for (const f of section.fields) {
      const raw = profile[f.name as string];
      switch (f.kind) {
        case "bool":
          v[f.name] = raw === true;
          break;
        case "tags":
        case "subjects":
        case "specialisms":
        case "curricula":
        case "grades":
          v[f.name] = Array.isArray(raw) ? raw.map(String) : [];
          break;
        default:
          v[f.name] = raw == null ? "" : String(raw);
      }
    }
  }
  return v;
}

function isFilled(v: string | string[] | boolean | undefined): boolean {
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "boolean") return v;
  return typeof v === "string" && v.trim().length > 0;
}

/* -------------------------------------------------- the two read-only panels */

const DOC_LABEL: Record<string, string> = {
  passport: "Passport",
  diploma: "Degree certificate",
  teaching_certificate: "Teaching certificate",
  transcript: "Transcript",
  reference_letter: "Reference letter",
  background_check: "Background check",
  visa: "Visa",
  medical: "Medical",
};

function Documents({ documents }: { documents: CandidateDoc[] }) {
  return (
    <section className="dash-section" aria-labelledby="docs">
      <div className="dash-head">
        <h2 id="docs">Documents</h2>
        <p>
          Stored in a restricted place and shown only to a school you have
          applied to, once your application reaches screening. Every time
          someone opens one, it is logged.
        </p>
      </div>
      {documents.length === 0 ? (
        <p className="queue-clear">
          Nothing uploaded. These do not affect how you are ranked — they
          decide whether a school can act once they want you.
        </p>
      ) : (
        <ul className="panel panel-rows pf-docs">
          {documents.map((d) => (
            <li key={d.id} data-status={d.status}>
              <span className="pf-doc-name">{DOC_LABEL[d.type] ?? d.type}</span>
              <span className={`chip chip-${docTone(d)}`}>
                <span className="dot" style={{ background: "currentColor" }} />
                {docWord(d)}
              </span>
              <span className="pf-doc-note">
                {d.rejectionReason ??
                  (d.daysUntilExpiry != null && d.daysUntilExpiry < 180
                    ? `Expires in ${d.daysUntilExpiry} days. Most work permits need six months left.`
                    : d.expiresOn
                      ? `Valid to ${new Date(d.expiresOn).toLocaleDateString("en-GB", {
                          month: "short",
                          year: "numeric",
                        })}`
                      : "")}
              </span>
              <button type="button" className="btn btn-quiet" disabled>
                {d.status === "missing" ? "Upload" : "Replace"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const docTone = (d: CandidateDoc) =>
  d.status === "rejected" || d.status === "expired"
    ? "critical"
    : d.status === "missing"
      ? "neutral"
      : d.daysUntilExpiry != null && d.daysUntilExpiry < 180
        ? "caution"
        : "positive";

const docWord = (d: CandidateDoc) =>
  d.status === "missing"
    ? "Not uploaded"
    : d.status === "under_review"
      ? "Being checked"
      : d.status === "rejected"
        ? "Rejected"
        : d.status === "expired"
          ? "Expired"
          : d.daysUntilExpiry != null && d.daysUntilExpiry < 180
            ? "Expiring"
            : "Verified";

const REL_LABEL: Record<string, string> = {
  direct_supervisor: "Direct supervisor",
  head_of_school: "Head of school",
  department_head: "Department head",
  colleague: "Colleague",
};

function References({ references }: { references: CandidateRef[] }) {
  return (
    <section className="dash-section" aria-labelledby="refs">
      <div className="dash-head">
        <h2 id="refs">References</h2>
        <p>
          A reference from someone who managed you carries far more weight than
          one from a peer, and a peer reference rarely counts towards
          safeguarding at all.
        </p>
      </div>
      {references.length === 0 ? (
        <p className="queue-clear">
          None yet. Name a supervisor and we ask them directly — they answer
          through a one-time link, with no account to create.
        </p>
      ) : (
        <ul className="panel panel-rows pf-refs">
          {references.map((r) => (
            <li key={r.id}>
              <span className="pf-ref-who">
                <strong>{r.refereeName}</strong>
                <span className="readout">
                  {r.refereeTitle}
                  {r.refereeSchool && ` · ${r.refereeSchool}`}
                </span>
              </span>
              <span
                className={`chip chip-${r.relationship === "colleague" ? "caution" : "neutral"}`}
              >
                {REL_LABEL[r.relationship] ?? r.relationship}
              </span>
              <span className={`chip chip-${r.status === "verified" ? "positive" : "neutral"}`}>
                {r.status === "verified"
                  ? "Confirmed"
                  : r.daysWaiting != null
                    ? `Waiting ${r.daysWaiting}d`
                    : "Requested"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

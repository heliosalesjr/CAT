"use client";

import { useState } from "react";
import { Avatar } from "./Avatar";
import type { CandidateDoc, CandidateRef } from "@/lib/dashboard-data";

/**
 * The form a candidate fills in, as a mockup.
 *
 * Every field is prefilled from the real record, and every section reports how
 * much of itself is answered — computed from which fields are actually
 * populated, not hard-coded. The point of the screen is to make the gap
 * legible: at 94% Daniel's only missing field is a photograph, and the form
 * should say exactly that rather than show a bar at 94 with no explanation.
 *
 * Nothing submits. Inputs are controlled so the demo can be typed into, and
 * the state is discarded on reload.
 */

type Field = {
  name: string; label: string; hint?: string;
  type?: "text" | "number" | "date" | "textarea" | "tags" | "money";
  unit?: string;
};

const SECTIONS: { id: string; title: string; blurb: string; fields: Field[] }[] = [
  {
    id: "you", title: "You", blurb: "What a school sees first, and how they reach you.",
    fields: [
      { name: "firstName", label: "First name" },
      { name: "lastName", label: "Last name" },
      { name: "headline", label: "Headline",
        hint: "One line. This is what appears beside your name on a shortlist." },
      { name: "nationality", label: "Nationality",
        hint: "Work permits turn on this. Some postings exclude nationalities for permit reasons, and you are told before you apply." },
      { name: "nationalities", label: "All passports held", type: "tags",
        hint: "A second passport often changes which countries can hire you." },
      { name: "languages", label: "Languages", type: "tags" },
      { name: "linkedinUrl", label: "LinkedIn", hint: "Optional." },
    ],
  },
  {
    id: "where", title: "Where you are, where you'd go",
    blurb: "Used to match you to roles and to show interview times in your clock.",
    fields: [
      { name: "currentSchool", label: "Current school" },
      { name: "currentCity", label: "City" },
      { name: "currentCountry", label: "Country" },
      { name: "timezone", label: "Time zone",
        hint: "Every interview time you are shown is converted into this." },
      { name: "preferredRegions", label: "Regions you would move to", type: "tags" },
      { name: "regionsWorked", label: "Regions you have worked in", type: "tags" },
      { name: "availableFrom", label: "Available from", type: "date" },
    ],
  },
  {
    id: "teaching", title: "What you do",
    blurb: "The single biggest factor in whether a school's ranking puts you near the top. Leadership and student-support roles are read from the same fields.",
    fields: [
      { name: "subjects", label: "Subjects or specialism", type: "tags",
        hint: "What you teach, or the area you work in \u2014 counselling, librarianship, admissions. Postings are matched against this." },
      { name: "curriculumExperience", label: "Curricula", type: "tags",
        hint: "IB, Cambridge, AP and the rest. Schools filter hard on this, including for roles outside the classroom \u2014 a counsellor at an IB school is expected to know the programme." },
      { name: "gradeLevels", label: "Grade levels", type: "tags" },
      { name: "yearsExperience", label: "Years in the profession", type: "number" },
      { name: "yearsInSubject", label: "Years in your specialism", type: "number" },
      { name: "leadershipYears", label: "Years leading a team", type: "number",
        hint: "Coordination or department-head time. Counted separately because coordinator roles weigh it above classroom years." },
      { name: "coachingActivities", label: "Coaching and activities", type: "tags" },
    ],
  },
  {
    id: "quals", title: "Qualifications",
    blurb: "Backed by the documents below. Both have to agree.",
    fields: [
      { name: "highestDegree", label: "Highest degree" },
      { name: "degreeField", label: "Field" },
    ],
  },
  {
    id: "package", title: "Package and family",
    blurb: "Never shown to schools as a number. It filters which roles reach you.",
    fields: [
      { name: "salaryExpectationMinUsd", label: "Salary expectation, from", type: "money" },
      { name: "salaryExpectationMaxUsd", label: "to", type: "money" },
      { name: "dependents", label: "Dependents moving with you", type: "number",
        hint: "Decides whether a package covering two tuitions is viable for you." },
      { name: "partnerTeacherId", label: "Teaching partner",
        hint: "If your partner is also applying through us, linking you means schools can consider you as a pair." },
    ],
  },
];

export function ProfileForm({
  record, documents, references, completeness, hasPhoto, name,
}: {
  record: Record<string, unknown>;
  documents: CandidateDoc[];
  references: CandidateRef[];
  completeness: number;
  hasPhoto: boolean;
  name: string;
}) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const v: Record<string, string> = {};
    for (const s of SECTIONS)
      for (const f of s.fields) v[f.name] = toInput(record[f.name]);
    return v;
  });
  const [open, setOpen] = useState<string>("you");

  const filled = (f: Field) => values[f.name]?.trim().length > 0;

  return (
    <>
      <section className="dash-section pf-photo-row">
        <Avatar name={name} size={96} missing={!hasPhoto} />
        <div>
          <h2>Photograph</h2>
          {hasPhoto ? (
            <p>Schools see this beside your name on every shortlist.</p>
          ) : (
            <p>
              <strong>This is the only thing missing from your profile.</strong>{" "}
              At {completeness}% complete, a photograph is the gap — schools see a
              blank square beside your name on every shortlist they open.
            </p>
          )}
          <button type="button" className="btn btn-accent">
            {hasPhoto ? "Replace photo" : "Upload a photo"}
          </button>
        </div>
      </section>

      {SECTIONS.map((s) => {
        const done = s.fields.filter(filled).length;
        const isOpen = open === s.id;
        return (
          <section key={s.id} className="dash-section pf-section">
            <button type="button" className="pf-head" aria-expanded={isOpen}
                    onClick={() => setOpen(isOpen ? "" : s.id)}>
              <span className="pf-head-main">
                <h2>{s.title}</h2>
                <span className="pf-blurb">{s.blurb}</span>
              </span>
              <span className="pf-progress">
                <span className="bar pf-bar">
                  {/* scaleX rather than width: this moves on every keystroke,
                      and width would relayout the header each time. */}
                  <span style={{ transform: `scaleX(${done / s.fields.length})`,
                                 background: done === s.fields.length
                                   ? "var(--positive)" : "var(--stage-screening)" }} />
                </span>
                <span className="readout num">{done}/{s.fields.length}</span>
              </span>
            </button>

            <div className="pf-body" data-open={isOpen || undefined} aria-hidden={!isOpen}>
              {/* The clip layer carries the overflow so the fields grid can keep
                  its own padding. Padding on the grid child itself does not
                  collapse with the 0fr track, and a closed section was holding
                  26px of dead space. */}
              <div className="pf-clip">
                <div className="pf-fields">
                {s.fields.map((f) => (
                  <label key={f.name} className="pf-field" data-empty={!filled(f) || undefined}>
                    <span className="pf-label">
                      {f.label}
                      {!filled(f) && <span className="pf-missing readout">Not answered</span>}
                    </span>
                    {f.type === "textarea" ? (
                      <textarea id={f.name} name={f.name} rows={3} value={values[f.name]}
                                onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))} />
                    ) : (
                      <span className="pf-input-wrap">
                        {f.type === "money" && <span className="pf-prefix">$</span>}
                        <input id={f.name} name={f.name}
                               type={f.type === "number" || f.type === "money" ? "number"
                                     : f.type === "date" ? "date" : "text"}
                               value={values[f.name]}
                               placeholder={f.type === "tags" ? "Add one, then another" : ""}
                               onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))} />
                      </span>
                    )}
                    {f.hint && <span className="pf-hint">{f.hint}</span>}
                  </label>
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
        <button type="button" className="btn btn-accent">Save changes</button>
        <span className="readout">Mockup — nothing is submitted</span>
      </section>
    </>
  );
}

const DOC_LABEL: Record<string, string> = {
  passport: "Passport", diploma: "Degree certificate",
  teaching_certificate: "Teaching certificate", transcript: "Transcript",
  reference_letter: "Reference letter", background_check: "Background check",
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
      <ul className="panel panel-rows pf-docs">
        {documents.map((d) => (
          <li key={d.id} data-status={d.status}>
            <span className="pf-doc-name">{DOC_LABEL[d.type] ?? d.type}</span>
            <span className={`chip chip-${docTone(d)}`}>
              <span className="dot" style={{ background: "currentColor" }} />
              {docWord(d)}
            </span>
            <span className="pf-doc-note">
              {d.rejectionReason
                ?? (d.daysUntilExpiry != null && d.daysUntilExpiry < 180
                    ? `Expires in ${d.daysUntilExpiry} days. Most work permits need six months left.`
                    : d.expiresOn
                      ? `Valid to ${new Date(d.expiresOn).toLocaleDateString("en-GB",
                          { month: "short", year: "numeric" })}`
                      : "")}
            </span>
            <button type="button" className="btn btn-quiet">
              {d.status === "missing" ? "Upload" : "Replace"}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

const docTone = (d: CandidateDoc) =>
  d.status === "rejected" || d.status === "expired" ? "critical"
  : d.status === "missing" ? "neutral"
  : d.daysUntilExpiry != null && d.daysUntilExpiry < 180 ? "caution"
  : "positive";

const docWord = (d: CandidateDoc) =>
  d.status === "missing" ? "Not uploaded"
  : d.status === "under_review" ? "Being checked"
  : d.status === "rejected" ? "Rejected"
  : d.status === "expired" ? "Expired"
  : d.daysUntilExpiry != null && d.daysUntilExpiry < 180 ? "Expiring"
  : "Verified";

const REL_LABEL: Record<string, string> = {
  direct_supervisor: "Direct supervisor", head_of_school: "Head of school",
  department_head: "Department head", colleague: "Colleague",
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
        <p className="queue-clear">None yet. Name a supervisor and we ask them directly.</p>
      ) : (
        <ul className="panel panel-rows pf-refs">
          {references.map((r) => (
            <li key={r.id}>
              <span className="pf-ref-who">
                <strong>{r.refereeName}</strong>
                <span className="readout">
                  {r.refereeTitle}{r.refereeSchool && ` · ${r.refereeSchool}`}
                </span>
              </span>
              <span className={`chip chip-${r.relationship === "colleague" ? "caution" : "neutral"}`}>
                {REL_LABEL[r.relationship] ?? r.relationship}
              </span>
              <span className={`chip chip-${r.status === "verified" ? "positive" : "neutral"}`}>
                {r.status === "verified" ? "Confirmed"
                  : r.daysWaiting != null ? `Waiting ${r.daysWaiting}d` : "Requested"}
              </span>
            </li>
          ))}
        </ul>
      )}
      <button type="button" className="btn btn-quiet pf-add-ref">Add a referee</button>
    </section>
  );
}

/** Arrays become comma lists; everything else becomes a string. */
function toInput(v: unknown): string {
  if (v == null) return "";
  if (Array.isArray(v)) return v.join(", ");
  return String(v);
}

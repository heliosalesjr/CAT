"use client";

import { useActionState } from "react";
import { completeCandidate, type FormState } from "../actions";
import { Problems } from "../Problems";

/**
 * Step two for a candidate: a name, and decision 3's question.
 *
 * The question is here rather than buried in the profile because it changes
 * what the rest of the profile asks and what the matching compares. It is
 * checkboxes and not a single choice: a head of science who would still take
 * a DP Chemistry post is the normal case in international schools, and
 * forcing them to pick one would make the matching wrong for exactly the
 * people the platform is best at placing.
 *
 * Nothing asks for a subject yet. That is the profile's job, and the profile
 * is the next screen.
 */
export function CandidateFinish({ email }: { email: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    completeCandidate,
    null,
  );

  return (
    <form action={action} className="su-card">
      <div className="su-steps" aria-hidden>
        <span data-done />
        <span data-done />
        <span />
      </div>

      <header>
        <span className="label label-teal">Step two of three</span>
        <h1 className="display-md" style={{ marginBlock: "10px 10px" }}>
          Tell us who you are
        </h1>
        <p className="body measure">
          Signed in as <strong>{email}</strong>. Two questions, then your
          profile — which you can fill in over as many sittings as you like.
        </p>
      </header>

      <div className="su-fields two">
        <label className="su-field">
          <span>First name</span>
          <input name="firstName" autoComplete="given-name" required maxLength={80} />
        </label>
        <label className="su-field">
          <span>Last name</span>
          <input name="lastName" autoComplete="family-name" required maxLength={80} />
        </label>
      </div>

      {/* Read from the browser rather than asked. Every interview time in the
          product is rendered in both parties' zones, so this column is never
          empty — and a dropdown of 400 zones is a worse question than none. */}
      <TimezoneField />

      <fieldset style={{ border: 0, padding: 0, margin: 0, display: "grid", gap: 10 }}>
        <legend className="su-field" style={{ padding: 0 }}>
          <span>What kind of post are you looking for?</span>
        </legend>
        <p className="su-hint" style={{ marginTop: -4 }}>
          Pick everything that applies. Most international-school leaders still
          teach, and the platform expects that.
        </p>
        <div className="su-families">
          <Family
            value="teacher"
            title="Classroom teaching"
            blurb="A subject, a homeroom, early years — anything where you teach."
          />
          <Family
            value="administrator"
            title="Leadership"
            blurb="Coordinator, head of department, head of school. Your years leading a team are weighed above classroom years for these."
          />
          <Family
            value="support_staff"
            title="Student support and specialist roles"
            blurb="Counselling, learning support, library, nursing, admissions. These are matched on your specialism rather than on a subject."
          />
        </div>
      </fieldset>

      <Problems state={state} />

      <div className="su-actions">
        <button className="su-btn" type="submit" disabled={pending}>
          {pending ? "Creating your profile…" : "Create my profile"}
        </button>
      </div>
    </form>
  );
}

function Family({ value, title, blurb }: { value: string; title: string; blurb: string }) {
  return (
    <label className="su-family">
      <input type="checkbox" name="roleFamilies" value={value} />
      <span>
        <strong>{title}</strong>
        <br />
        <span>{blurb}</span>
      </span>
    </label>
  );
}

function TimezoneField() {
  // Resolved on the client, where the answer actually is. If the browser
  // cannot say, the field stays visible and typeable rather than guessing.
  const guess =
    typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "";

  return (
    <label className="su-field">
      <span>Your time zone</span>
      <input name="timezone" defaultValue={guess} required readOnly={!!guess} />
      <span className="su-hint">
        Taken from your browser. Interview times are always shown in both your
        zone and the school&rsquo;s, so this one matters.
      </span>
    </label>
  );
}

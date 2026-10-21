"use client";

import type { FormState } from "./actions";

/**
 * What came back wrong, in the words the layer that refused it used.
 *
 * Field-level problems and a whole-form error are shown the same way because
 * they mean the same thing to the person reading: this did not go through,
 * here is why. Database refusals arrive here too — a duplicate address, an
 * identity that already acts for a school — and their messages were written
 * to be read.
 */
export function Problems({ state }: { state: FormState }) {
  if (!state) return null;

  if ("error" in state) {
    return (
      <p className="su-error" role="alert">
        {state.error}
      </p>
    );
  }

  return (
    <ul className="su-error" role="alert" style={{ listStyle: "none", display: "grid", gap: 4 }}>
      {state.problems.map((p) => (
        <li key={p.field}>
          <strong>{LABELS[p.field] ?? p.field}</strong> {p.message}
        </li>
      ))}
    </ul>
  );
}

const LABELS: Record<string, string> = {
  email: "Email",
  firstName: "First name",
  lastName: "Last name",
  timezone: "Time zone",
  roleFamilies: "Kind of post —",
  schoolId: "School",
  schoolName: "School name",
  country: "Country",
  phone: "Phone",
  addressLine: "Address",
};

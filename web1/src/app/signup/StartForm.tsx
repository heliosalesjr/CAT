"use client";

import { useActionState, useState } from "react";
import { startSignup, type FormState } from "./actions";
import { Problems } from "./Problems";

/**
 * Step one for both sides: which side, and the address.
 *
 * The address is asked before anything else on purpose. For a school user it
 * is what finds the school — the domain answers that question, so asking for
 * the school first would be asking something we can usually work out. And for
 * either side it is the login, which means nothing about a person is stored
 * until they have proved the address.
 */
export function StartForm() {
  const [side, setSide] = useState<"candidate" | "school">("candidate");
  const [state, action, pending] = useActionState<FormState, FormData>(startSignup, null);

  const isSchool = side === "school";

  return (
    <form action={action} className="su-card">
      <div className="su-steps" aria-hidden>
        <span data-done />
        <span />
        <span />
      </div>

      <div className="su-sides">
        <label className="su-side" data-chosen={!isSchool || undefined}>
          <input
            type="radio"
            name="as"
            value="candidate"
            checked={!isSchool}
            onChange={() => setSide("candidate")}
          />
          <strong>I work in education</strong>
          <span>
            Teaching, leadership or student support. You build one profile and
            schools come to you.
          </span>
        </label>

        <label className="su-side" data-chosen={isSchool || undefined}>
          <input
            type="radio"
            name="as"
            value="school"
            checked={isSchool}
            onChange={() => setSide("school")}
          />
          <strong>I hire for a school</strong>
          <span>
            Post roles, rank candidates and run your pipeline. Use your work
            address.
          </span>
        </label>
      </div>

      <label className="su-field" data-bad={hasProblem(state, "email") || undefined}>
        <span>{isSchool ? "Your work email" : "Your email"}</span>
        <input
          type="email"
          name="email"
          autoComplete="email"
          required
          inputMode="email"
          placeholder={isSchool ? "you@yourschool.edu" : "you@example.com"}
        />
        <span className="su-hint">
          {isSchool
            ? "The domain usually tells us which school you are at, so you will not have to go looking for it."
            : "We send a link instead of asking you to invent a password."}
        </span>
      </label>

      <Problems state={state} />

      <div className="su-actions">
        <button className="su-btn" type="submit" disabled={pending}>
          {pending ? "Sending the link…" : "Send me a sign-in link"}
        </button>
        <span className="readout">No password, nothing stored yet</span>
      </div>
    </form>
  );
}

function hasProblem(state: FormState, field: string): boolean {
  return !!state && "problems" in state && state.problems.some((p) => p.field === field);
}

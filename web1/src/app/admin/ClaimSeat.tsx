"use client";

import { useActionState } from "react";
import { claimSeat } from "./actions";

type State = { error: string } | null;

export function ClaimSeat() {
  const [state, action, pending] = useActionState<State, FormData>(
    async () => claimSeat(),
    null,
  );

  return (
    <form action={action} className="su-actions">
      <button className="su-btn" type="submit" disabled={pending}>
        {pending ? "Checking…" : "I have been added — claim my seat"}
      </button>
      {state?.error && (
        <span className="su-bad" role="alert">
          {state.error}
        </span>
      )}
    </form>
  );
}

"use client";

import { useActionState } from "react";
import {
  confirmSchoolUserAction,
  proveDomainAction,
  unverifySchoolAction,
  verifySchoolAction,
  type ActionResult,
} from "./actions";

/**
 * The three queues, and the judgement each one asks for.
 *
 * Every card shows what a person needs to decide without opening another tab:
 * for a school, the phone number and website they are about to trust; for a
 * person, whether their own address already matches a domain the school has
 * proved; for a domain, how many accounts are waiting behind it.
 *
 * The cost of each button is written next to it, because the three are not
 * equally serious. Confirming one person lets one person in. Proving a domain
 * lets everybody on it in, for ever, with nobody reading anything.
 */

type Row = Record<string, unknown>;

function Result({ state }: { state: ActionResult }) {
  if (!state) return null;
  return "ok" in state ? (
    <p className="su-note" role="status">
      {state.ok}
    </p>
  ) : (
    <p className="su-error" role="alert">
      {state.error}
    </p>
  );
}

/* ------------------------------------------------------------- the schools */

export function SchoolQueue({ schools }: { schools: Row[] }) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(
    verifySchoolAction,
    null,
  );

  if (!schools.length) {
    return (
      <p className="su-note">
        No school is waiting. A school that registers itself lands here, and
        cannot post a role until somebody reads these details and agrees.
      </p>
    );
  }

  return (
    <>
      <Result state={state} />
      <div className="aq-list">
        {schools.map((s) => {
          const domains = (s.domainsClaimed as string[] | null) ?? [];
          return (
            <form key={String(s.schoolId)} action={action} className="aq-card">
              <input type="hidden" name="schoolId" value={String(s.schoolId)} />
              <input type="hidden" name="schoolName" value={String(s.name)} />

              <div className="aq-head">
                <strong>{String(s.name)}</strong>
                <span className="readout">
                  {[s.city, s.country].filter(Boolean).join(", ") || "no location given"}
                </span>
              </div>

              <dl className="aq-facts">
                <Fact label="Phone" value={s.phone} />
                <Fact label="Address" value={s.addressLine} />
                <Fact label="Website" value={s.website} link />
                <Fact label="Students" value={s.studentCount} />
                <Fact label="Registered by" value={s.registeredBy} />
                <Fact label="Their address" value={s.registeredByEmail} />
                <Fact label="Accounts waiting" value={s.usersTotal} />
                <Fact label="Domain claimed" value={domains.join(", ") || "none"} />
              </dl>

              <div className="aq-act">
                <button className="su-btn" type="submit" disabled={pending}>
                  {pending ? "Verifying…" : "Verify this school"}
                </button>
                <span className="readout">
                  Check the phone number and the website against each other first.
                </span>
              </div>
            </form>
          );
        })}
      </div>
    </>
  );
}

/* --------------------------------------------------------------- the people */

export function UserQueue({ users }: { users: Row[] }) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(
    confirmSchoolUserAction,
    null,
  );

  if (!users.length) {
    return (
      <p className="su-note">
        Nobody is waiting. Somebody whose work domain is proved never appears
        here — they are let in on the strength of the address.
      </p>
    );
  }

  return (
    <>
      <Result state={state} />
      <div className="aq-list">
        {users.map((u) => (
          <form key={String(u.schoolUserId)} action={action} className="aq-card">
            <input type="hidden" name="schoolUserId" value={String(u.schoolUserId)} />
            <input type="hidden" name="who" value={String(u.name || u.email)} />

            <div className="aq-head">
              <strong>{String(u.name) || String(u.email)}</strong>
              <span className="readout">
                {String(u.role)} at {String(u.schoolName)}
              </span>
            </div>

            <dl className="aq-facts">
              <Fact label="Address" value={u.email} />
              <Fact label="Title" value={u.title} />
              <Fact label="School" value={`${u.schoolName} (${u.schoolStatus})`} />
            </dl>

            {u.domainProved ? (
              <p className="su-note">
                Their domain <strong>{String(u.emailDomain)}</strong> is already
                proved for this school, so they should not have landed here.
                Confirming is harmless; worth knowing why it happened.
              </p>
            ) : u.domainClaimedOnly ? (
              <p className="su-note">
                The school claims <strong>{String(u.emailDomain)}</strong> but
                nobody has proved it. Proving the domain below would let this
                person — and everybody else on it — in without this step.
              </p>
            ) : (
              <p className="su-note">
                <strong>{String(u.emailDomain)}</strong> is not a domain this
                school claims. Confirm only if you know who this is.
              </p>
            )}

            <div className="aq-act">
              <button className="su-btn" type="submit" disabled={pending}>
                {pending ? "Confirming…" : "Confirm this person"}
              </button>
              <span className="readout">
                Their role starts granting what it says — including reading
                documents, if it is hr or principal.
              </span>
            </div>
          </form>
        ))}
      </div>
    </>
  );
}

/* -------------------------------------------------------------- the domains */

export function DomainQueue({ domains }: { domains: Row[] }) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(
    proveDomainAction,
    null,
  );

  if (!domains.length) {
    return <p className="su-note">No domain is waiting to be proved.</p>;
  }

  return (
    <>
      <Result state={state} />
      <div className="aq-list">
        {domains.map((d) => (
          <form
            key={`${d.schoolId}:${d.domain}`}
            action={action}
            className="aq-card"
            data-weight="high"
          >
            <input type="hidden" name="schoolId" value={String(d.schoolId)} />
            <input type="hidden" name="domain" value={String(d.domain)} />

            <div className="aq-head">
              <strong>{String(d.domain)}</strong>
              <span className="readout">
                claimed by {String(d.schoolName)} ({String(d.schoolStatus)})
              </span>
            </div>

            <dl className="aq-facts">
              <Fact label="Accounts on it" value={d.usersOnDomain} />
            </dl>

            <p className="su-note">
              This is the one that scales. Prove it and anybody with an address
              on <strong>{String(d.domain)}</strong> joins this school
              verified, from now on, with nobody reading anything. The question
              is whether the domain belongs to the institution — not whether
              one person works there.
            </p>

            <div className="aq-act">
              <button className="su-btn" type="submit" disabled={pending}>
                {pending ? "Proving…" : "Prove this domain"}
              </button>
            </div>
          </form>
        ))}
      </div>
    </>
  );
}

/* ----------------------------------------------------- undo, for a verified one */

export function UnverifySchool({ schoolId, name }: { schoolId: string; name: string }) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(
    unverifySchoolAction,
    null,
  );

  return (
    <form action={action} className="aq-card">
      <input type="hidden" name="schoolId" value={schoolId} />
      <div className="aq-head">
        <strong>{name}</strong>
        <span className="readout">verified</span>
      </div>
      <label className="su-field">
        <span>Reason</span>
        <input name="reason" placeholder="Why this school is going back to pending" />
        <span className="su-hint">Required, and it goes in the audit log.</span>
      </label>
      <Result state={state} />
      <div className="aq-act">
        <button className="su-btn su-btn-quiet" type="submit" disabled={pending}>
          {pending ? "Working…" : "Send back to pending"}
        </button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------- bits */

function Fact({
  label,
  value,
  link,
}: {
  label: string;
  value: unknown;
  link?: boolean;
}) {
  if (value === null || value === undefined || value === "") return null;
  const text = String(value);
  return (
    <>
      <dt className="readout">{label}</dt>
      <dd>
        {link ? (
          <a href={text} target="_blank" rel="noreferrer noopener">
            {text}
          </a>
        ) : (
          text
        )}
      </dd>
    </>
  );
}

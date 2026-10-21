"use client";

import { useActionState, useState, useTransition } from "react";
import {
  completeSchoolJoin,
  completeSchoolRegistration,
  findSchools,
  type FormState,
} from "../actions";
import { Problems } from "../Problems";

type Match = { schoolId: string; schoolName: string; verificationStatus: string };

/**
 * Step two for a school user, in whichever of three shapes their own email
 * address produced.
 *
 *   preselected  one verified domain match. The common case, and the one that
 *                finishes with nobody in the loop — the link proved the
 *                address, the address proves the school.
 *   choose       several matches, which means a group running campuses off one
 *                domain. They pick theirs.
 *   unknown      a personal address, or a school nobody has registered. Search
 *                by name, or register it and wait for a human.
 *
 * What none of these screens offers is a role. A verified work domain proves
 * somebody works at a school; it does not follow that they should hold billing
 * and user administration, so a joiner at an established school arrives as a
 * coordinator and an admin who is already there elevates them. Somebody
 * registering a school nobody has yet does get to administer it — there is
 * nobody else to.
 */
export function SchoolFinish({
  email,
  matches,
  outcome,
}: {
  email: string;
  matches: Match[];
  outcome: "preselected" | "choose" | "unknown";
}) {
  const [picked, setPicked] = useState<Match | null>(
    outcome === "preselected" ? matches[0] : null,
  );
  const [registering, setRegistering] = useState(false);

  if (registering) {
    return <RegisterSchool email={email} onBack={() => setRegistering(false)} />;
  }

  if (picked) {
    return (
      <JoinSchool
        email={email}
        school={picked}
        proved={outcome !== "unknown"}
        onBack={outcome === "preselected" ? undefined : () => setPicked(null)}
      />
    );
  }

  return (
    <PickSchool
      email={email}
      matches={outcome === "choose" ? matches : []}
      onPick={setPicked}
      onRegister={() => setRegistering(true)}
    />
  );
}

/* ------------------------------------------------------------- choosing one */

function PickSchool({
  email,
  matches,
  onPick,
  onRegister,
}: {
  email: string;
  matches: Match[];
  onPick: (m: Match) => void;
  onRegister: () => void;
}) {
  const [term, setTerm] = useState("");
  const [found, setFound] = useState<Match[]>([]);
  const [searching, startSearch] = useTransition();
  const [searched, setSearched] = useState(false);

  const group = matches.length > 1;

  return (
    <div className="su-card">
      <div className="su-steps" aria-hidden>
        <span data-done />
        <span data-done />
        <span />
      </div>

      <header>
        <span className="label label-teal">Step two of three</span>
        <h1 className="display-md" style={{ marginBlock: "10px 10px" }}>
          {group ? "Which campus?" : "Which school do you hire for?"}
        </h1>
        <p className="body measure">
          {group
            ? `Several schools share ${email.split("@")[1]}. Pick the one you work at.`
            : `We could not tell from ${email}. Search for your school, or register it if it is not here yet.`}
        </p>
      </header>

      {group && (
        <div className="su-list">
          {matches.map((m) => (
            <button key={m.schoolId} type="button" onClick={() => onPick(m)}>
              <strong>{m.schoolName}</strong>
              <span>{m.verificationStatus === "verified" ? "Verified school" : "Awaiting verification"}</span>
            </button>
          ))}
        </div>
      )}

      {!group && (
        <>
          <label className="su-field">
            <span>School name</span>
            <input
              value={term}
              onChange={(e) => {
                const v = e.target.value;
                setTerm(v);
                setSearched(false);
                startSearch(async () => {
                  setFound(await findSchools(v));
                  setSearched(v.trim().length >= 2);
                });
              }}
              placeholder="Start typing — two letters is enough"
              autoComplete="off"
            />
          </label>

          {found.length > 0 && (
            <div className="su-list">
              {found.map((m) => (
                <button key={m.schoolId} type="button" onClick={() => onPick(m)}>
                  <strong>{m.schoolName}</strong>
                  <span>
                    {m.verificationStatus === "verified"
                      ? "Verified school"
                      : "Awaiting verification"}
                  </span>
                </button>
              ))}
            </div>
          )}

          {searched && !searching && found.length === 0 && (
            <p className="su-note">
              Nothing matching <strong>{term}</strong>. If your school is not on
              the platform yet, you can be the one to add it.
            </p>
          )}
        </>
      )}

      <div className="su-actions">
        <button type="button" className="su-btn su-btn-quiet" onClick={onRegister}>
          My school is not here — register it
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- joining */

function JoinSchool({
  email,
  school,
  proved,
  onBack,
}: {
  email: string;
  school: Match;
  proved: boolean;
  onBack?: () => void;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    completeSchoolJoin,
    null,
  );

  return (
    <form action={action} className="su-card">
      <div className="su-steps" aria-hidden>
        <span data-done />
        <span data-done />
        <span data-done />
      </div>

      <header>
        <span className="label label-teal">Step three of three</span>
        <h1 className="display-md" style={{ marginBlock: "10px 10px" }}>
          {school.schoolName}
        </h1>
        <p className="body measure">
          Signed in as <strong>{email}</strong>.
        </p>
      </header>

      <input type="hidden" name="schoolId" value={school.schoolId} />
      {/* Honoured only where the school has nobody verified yet. The server
          decides; this is the request, not the grant. */}
      <input type="hidden" name="requestedRole" value="hr" />

      <p className="su-note">
        {proved ? (
          <>
            Your address is on this school&rsquo;s domain, so{" "}
            <strong>we can let you straight in</strong> — no waiting on us.
          </>
        ) : (
          <>
            We cannot confirm from your address that you work here, so your
            account starts <strong>pending</strong>: you can look around, and
            you can post roles or see candidates once somebody confirms you.
            Usually quicker if a colleague who is already here invites you.
          </>
        )}
      </p>

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

      <label className="su-field">
        <span>Your title</span>
        <input name="title" placeholder="Head of Secondary, HR Manager…" maxLength={120} />
        <span className="su-hint">Optional. Candidates see it when you message them.</span>
      </label>

      <Problems state={state} />

      <div className="su-actions">
        <button className="su-btn" type="submit" disabled={pending}>
          {pending ? "Setting up…" : "Join this school"}
        </button>
        {onBack && (
          <button type="button" className="su-btn su-btn-quiet" onClick={onBack}>
            Wrong school
          </button>
        )}
      </div>
    </form>
  );
}

/* ------------------------------------------------------------- registering */

function RegisterSchool({ email, onBack }: { email: string; onBack: () => void }) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    completeSchoolRegistration,
    null,
  );
  const guess =
    typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "";

  return (
    <form action={action} className="su-card">
      <div className="su-steps" aria-hidden>
        <span data-done />
        <span data-done />
        <span data-done />
      </div>

      <header>
        <span className="label label-teal">Step three of three</span>
        <h1 className="display-md" style={{ marginBlock: "10px 10px" }}>
          Register your school
        </h1>
        <p className="body measure">
          A person checks these before the school can post a role — which is
          what stops anyone claiming a school they do not work at. Expect a day
          or two.
        </p>
      </header>

      <div className="su-fields">
        <label className="su-field">
          <span>School name</span>
          <input name="schoolName" required maxLength={200} />
        </label>
      </div>

      <div className="su-fields two">
        <label className="su-field">
          <span>City</span>
          <input name="city" maxLength={100} />
        </label>
        <label className="su-field">
          <span>Country</span>
          <input name="country" required maxLength={100} />
        </label>
      </div>

      <div className="su-fields two">
        <label className="su-field">
          <span>Phone</span>
          <input name="phone" type="tel" required maxLength={40} />
          <span className="su-hint">A number we can reach the school on.</span>
        </label>
        <label className="su-field">
          <span>Website</span>
          <input name="website" type="url" placeholder="https://" maxLength={200} />
        </label>
      </div>

      <div className="su-fields two">
        <label className="su-field">
          <span>Address</span>
          <input name="addressLine" required maxLength={200} />
        </label>
        <label className="su-field">
          <span>Postal code</span>
          <input name="postalCode" maxLength={40} />
        </label>
      </div>

      <input type="hidden" name="timezone" value={guess || "UTC"} />

      <hr className="hair" />

      <div className="su-fields two">
        <label className="su-field">
          <span>Your first name</span>
          <input name="firstName" autoComplete="given-name" required maxLength={80} />
        </label>
        <label className="su-field">
          <span>Your last name</span>
          <input name="lastName" autoComplete="family-name" required maxLength={80} />
        </label>
      </div>

      <label className="su-field">
        <span>Your title</span>
        <input name="title" maxLength={120} />
      </label>

      <p className="su-note">
        Registering means you administer this school on the platform: you can
        add colleagues and handle billing. Your address, <strong>{email}</strong>,
        becomes the school&rsquo;s domain — so colleagues on the same domain can
        join without going through this again.
      </p>

      <Problems state={state} />

      <div className="su-actions">
        <button className="su-btn" type="submit" disabled={pending}>
          {pending ? "Registering…" : "Register the school"}
        </button>
        <button type="button" className="su-btn su-btn-quiet" onClick={onBack}>
          Back to search
        </button>
      </div>
    </form>
  );
}

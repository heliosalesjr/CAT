import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { one } from "@/lib/db/client";
import {
  claimedDomains,
  pendingSchoolUsers,
  pendingSchools,
  platformQueue,
} from "@/lib/db/platform";
import type { PlatformUsersRow } from "@/lib/db/schema";
import { currentActor, currentIdentity } from "@/lib/session";
import { ClaimSeat } from "./ClaimSeat";
import { DomainQueue, SchoolQueue, UserQueue } from "./Queues";

export const metadata: Metadata = { title: "Platform — Class Act Talent" };
export const dynamic = "force-dynamic";

/**
 * The staff side, such as it is on day one: who you are, and how much is
 * waiting for a human.
 *
 * Access is the actor and nothing else. There is no permission check here
 * because there is no permission to check: being resolved as a
 * `platform_user` IS the authorisation, and a row only exists because somebody
 * with the database URL ran `npm run admin add`.
 */
export default async function AdminPage() {
  const identity = await currentIdentity();
  if (!identity) redirect("/signup");

  const actor = await currentActor();
  if (actor?.type !== "platform_user") {
    return (
      <div className="su-card">
        <span className="label label-teal">Not you</span>
        <h1 className="display-md" style={{ marginBlock: "10px 10px" }}>
          This side is for platform staff
        </h1>
        <p className="body measure">
          You are signed in as <strong>{identity.email}</strong>
          {actor ? ` (${actor.type.replace("_", " ")})` : ", with no profile yet"}. Staff
          accounts are added from the command line, never from a form:
        </p>
        <pre className="su-note" style={{ overflowX: "auto" }}>
          npm run admin add {identity.email} &quot;Your Name&quot; owner
        </pre>
        <p className="body measure">
          A seat binds when you sign in. If you were added just now, while
          already signed in, claim it here instead of signing out and back in.
        </p>
        <ClaimSeat />
        <div className="su-actions">
          <Link className="su-btn su-btn-quiet" href="/">
            Back to the site
          </Link>
        </div>
      </div>
    );
  }

  const [me, queue, schools, users, domains] = await Promise.all([
    one<PlatformUsersRow>(`SELECT * FROM platform_users WHERE id = $1`, [actor.id]),
    platformQueue(),
    pendingSchools(),
    pendingSchoolUsers(),
    claimedDomains(),
  ]);

  const rows: { label: string; value: number; note: string }[] = [
    {
      label: "Schools awaiting verification",
      value: Number(queue.schoolsPending),
      note: "A pending school cannot post a role.",
    },
    {
      label: "School users awaiting confirmation",
      value: Number(queue.schoolUsersPending),
      note: "Each one holds no permissions at all until confirmed.",
    },
    {
      label: "Email domains claimed, unproved",
      value: Number(queue.domainsClaimed),
      note: "An unproved domain lets nobody in behind it.",
    },
    {
      label: "Postings live",
      value: Number(queue.postingsLive),
      note: "Visible to candidates.",
    },
    {
      label: "Candidates",
      value: Number(queue.candidatesTotal),
      note: "Including the seeded sample.",
    },
  ];

  return (
    <>
      <header style={{ maxWidth: "36rem", marginBottom: 26 }}>
        {/* The role belongs in the eyebrow, where a middot between two labels
            reads as a separator. Inside the sentence below it read as a
            stumble: "signed in as an address · owner." */}
        <span className="label label-teal">Platform &middot; {me.role}</span>
        <h1 className="display-md" style={{ marginBlock: "10px 12px" }}>
          {me.firstName ? `Hello, ${me.firstName}` : "Platform staff"}
        </h1>
        <p className="lede">
          Signed in as {me.email}. Everything you can read here is logged
          against your name, including anybody&rsquo;s documents.
        </p>
      </header>

      <div className="su-card">
        <span className="label">What is waiting</span>
        <ul className="su-list" style={{ listStyle: "none" }}>
          {rows.map((r) => (
            <li
              key={r.label}
              style={{
                display: "grid",
                gridTemplateColumns: "3.5rem 1fr",
                gap: 14,
                padding: "12px 15px",
                background: "var(--color-paper-2)",
                border: "1px solid var(--color-rule)",
                alignItems: "baseline",
              }}
            >
              <strong
                className="stat-number"
                style={{ fontSize: 26, color: r.value > 0 ? "var(--color-teal-ink)" : undefined }}
              >
                {r.value}
              </strong>
              <span>
                <strong style={{ display: "block", fontSize: 14.5 }}>{r.label}</strong>
                <span className="readout">{r.note}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* The order is the order of consequence, lightest first. Proving a
          domain is last because it is the one that keeps letting people in
          after the person who clicked it has stopped paying attention. */}
      <section className="aq-section">
        <h2 className="title">Schools waiting</h2>
        <p className="body measure">
          A school cannot post a role until it is verified. You are deciding
          whether the institution is real — not whether the person who signed
          it up works there, which is the next queue down.
        </p>
        <SchoolQueue schools={schools} />
      </section>

      <section className="aq-section">
        <h2 className="title">People waiting</h2>
        <p className="body measure">
          Each of these holds <strong>no permissions at all</strong> until
          confirmed, whatever their role says. Confirming is what turns the
          role template on.
        </p>
        <UserQueue users={users} />
      </section>

      <section className="aq-section">
        <h2 className="title">Domains claimed</h2>
        <p className="body measure">
          The highest-leverage thing on this page, and the only one that keeps
          acting after you close the tab.
        </p>
        <DomainQueue domains={domains} />
      </section>
    </>
  );
}

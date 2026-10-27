import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { one } from "@/lib/db/client";
import type { PlatformQueueRow, PlatformUsersRow } from "@/lib/db/schema";
import { currentActor, currentIdentity } from "@/lib/session";
import { ClaimSeat } from "./ClaimSeat";

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

  const [me, queue] = await Promise.all([
    one<PlatformUsersRow>(`SELECT * FROM platform_users WHERE id = $1`, [actor.id]),
    one<PlatformQueueRow>(`SELECT * FROM platform_queue`),
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
        <span className="label label-teal">Platform</span>
        <h1 className="display-md" style={{ marginBlock: "10px 12px" }}>
          {me.firstName ? `Hello, ${me.firstName}` : "Platform staff"}
        </h1>
        <p className="lede">
          Signed in as {me.email} · {me.role}. Everything you can read here is
          logged against your name, including anybody&rsquo;s documents.
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
        <p className="su-note">
          Verifying a school, confirming a user and proving a domain are the
          next things to build here. Until then they are SQL — which is fine
          for four days of testing and not fine after that.
        </p>
      </div>
    </>
  );
}

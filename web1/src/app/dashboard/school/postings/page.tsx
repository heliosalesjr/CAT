import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { one } from "@/lib/db/client";
import { postingsForSchool } from "@/lib/db/postings";
import type { SchoolsRow } from "@/lib/db/schema";
import { currentActor } from "@/lib/session";
import { signInPath } from "@/lib/next-path";

export const metadata: Metadata = { title: "Your roles — Class Act Talent" };
export const dynamic = "force-dynamic";

const STATUS_WORD: Record<string, string> = {
  posted: "Live",
  draft: "Draft",
  on_hold: "Paused",
  closed: "Closed",
  archived: "Archived",
};

export default async function PostingsPage({
  searchParams,
}: PageProps<"/dashboard/school/postings">) {
  const actor = await currentActor();
  if (!actor) redirect(signInPath("/dashboard/school/postings"));
  if (actor.type !== "school_user") redirect("/dashboard/teacher");

  const { created } = (await searchParams) as { created?: string };
  const [school, postings] = await Promise.all([
    one<SchoolsRow>(`SELECT * FROM schools WHERE id = $1`, [actor.schoolId]),
    postingsForSchool(actor.schoolId),
  ]);
  const justMade = postings.find((p) => p.id === created);

  return (
    <main className="dash-wrap">
      <header className="dash-top">
        <div className="dash-ident">
          <Link href="/dashboard/school" className="readout pf-back">
            &larr; Back to the dashboard
          </Link>
          <h1>Your roles</h1>
          <span className="readout">
            {school.name} · {school.verificationStatus === "verified" ? "verified" : "awaiting verification"}
          </span>
        </div>
        <Link className="btn btn-accent" href="/dashboard/school/postings/new">
          Open a role
        </Link>
      </header>

      {justMade && (
        <p className="note">
          <strong>{justMade.title}</strong> is saved as{" "}
          {STATUS_WORD[justMade.status]?.toLowerCase() ?? justMade.status}.
          {justMade.status === "posted"
            ? " Candidates can see it now."
            : " Nobody outside your school can see it yet."}
        </p>
      )}

      {postings.length === 0 ? (
        <section className="dash-section">
          <p className="queue-clear">
            No roles yet. The first thing a candidate sees of your school is a
            role, so this is where it starts.
          </p>
        </section>
      ) : (
        <section className="dash-section">
          <ul className="panel panel-rows">
            {postings.map((p) => (
              <li key={p.id} className="lrow"
                  data-state={p.status === "posted" ? "live" : "quiet"}>
                <span className="lrow-body">
                  <span className="lrow-title">
                    <Link href={`/dashboard/school/postings/${p.id}`}>{p.title}</Link>
                    <span className={`chip chip-${p.status === "posted" ? "positive" : "neutral"}`}>
                      {STATUS_WORD[p.status] ?? p.status}
                    </span>
                  </span>
                  <span className="lrow-meta">
                    {p.rankingCriteria.length} ranking criteria,{" "}
                    {p.aiRankingEnabled ? "ordering on" : "ordering off"}
                  </span>
                  {p.status !== "posted" && (
                    <span className="lrow-note">
                      Nobody outside your school can see this one.
                    </span>
                  )}
                </span>
                <span className="lrow-side">
                  <span className="lrow-fig">{p.applicationCount}</span>
                  <span className="readout">
                    application{p.applicationCount === 1 ? "" : "s"}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { openPostings, whyCannotApply, applicationsForCandidate } from "@/lib/db/applications";
import { query } from "@/lib/db/client";
import type { SchoolsRow } from "@/lib/db/schema";
import { currentActor } from "@/lib/session";
import { JobList } from "./JobList";

export const metadata: Metadata = { title: "Open roles — Class Act Talent" };
export const dynamic = "force-dynamic";

const money = (min: number | null, max: number | null) =>
  min && max ? `$${min.toLocaleString()}–$${max.toLocaleString()}`
  : min ? `from $${min.toLocaleString()}`
  : max ? `up to $${max.toLocaleString()}`
  : null;

export default async function JobsPage() {
  const actor = await currentActor();
  if (!actor) redirect("/signup");
  if (actor.type !== "candidate") redirect("/dashboard/school");

  const [postings, mine] = await Promise.all([
    openPostings(),
    applicationsForCandidate(actor.id),
  ]);

  const schools = await query<SchoolsRow>(
    `SELECT * FROM schools WHERE id = ANY($1)`,
    [[...new Set(postings.map((p) => p.schoolId))]],
  );
  const schoolById = new Map(schools.map((s) => [s.id, s]));

  // Asked per role rather than guessed: the reason is a sentence from the
  // database, and the candidate reads the same words the rule is written in.
  const jobs = await Promise.all(
    postings.map(async (p) => {
      const s = schoolById.get(p.schoolId);
      return {
        id: p.id,
        title: p.title,
        schoolName: s?.name ?? "A school",
        where: [s?.city, s?.country].filter(Boolean).join(", "),
        roleFamily: p.roleFamily,
        subjects: p.subjects,
        specialisms: p.specialisms,
        salary: money(p.salaryMinUsd, p.salaryMaxUsd),
        startDate: p.startDate,
        applyBy: p.applyByDate,
        blocked: await whyCannotApply(actor.id, p.id),
      };
    }),
  );

  return (
    <main className="dash-wrap">
      <header className="dash-top">
        <div className="dash-ident">
          <Link href="/dashboard/teacher" className="readout pf-back">
            &larr; Back to your applications
          </Link>
          <h1>Open roles</h1>
          <span className="readout">
            {jobs.length} live · you have applied to {mine.length}
          </span>
        </div>
      </header>

      <section className="dash-section">
        <JobList jobs={jobs} />
      </section>

      {mine.length > 0 && (
        <section className="dash-section">
          <div className="dash-head">
            <h2>Where your applications stand</h2>
          </div>
          <ul className="panel panel-rows">
            {mine.map((a) => (
              <li key={a.applicationId} style={{ display: "grid", gap: 3 }}>
                <span style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                  <strong>{a.title}</strong>
                  <span className="readout">{a.schoolName}</span>
                </span>
                <span className="readout">
                  {a.stage}
                  {a.notRankableReason === "awaiting_ranking" &&
                    " · not scored yet — nothing for you to do"}
                  {a.notRankableReason === "profile_incomplete" &&
                    " · your profile is below the ranking threshold, so you are shown separately"}
                  {a.rejectionReason && ` · ${a.rejectionReason}`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

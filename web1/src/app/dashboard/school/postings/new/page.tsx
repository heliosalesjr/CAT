import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { schoolUserHas } from "@/lib/db/actors";
import { practiceOptions } from "@/lib/db/candidates";
import { criteriaCatalog, planAllowsRanking } from "@/lib/db/postings";
import { one } from "@/lib/db/client";
import type { SchoolsRow } from "@/lib/db/schema";
import { currentActor } from "@/lib/session";
import { PostingForm } from "./PostingForm";

export const metadata: Metadata = { title: "Open a role — Class Act Talent" };
export const dynamic = "force-dynamic";

export default async function NewPostingPage() {
  const actor = await currentActor();
  if (!actor) redirect("/signup");
  if (actor.type !== "school_user") redirect("/dashboard/teacher");

  const [school, mayPost, criteria, subjects, specialisms, rankingAllowed] =
    await Promise.all([
      one<SchoolsRow>(`SELECT * FROM schools WHERE id = $1`, [actor.schoolId]),
      schoolUserHas(actor.id, "post_jobs"),
      criteriaCatalog(),
      practiceOptions("subject"),
      practiceOptions("specialism"),
      planAllowsRanking(actor.schoolId),
    ]);

  if (!mayPost) {
    return (
      <main className="dash-wrap">
        <div className="su-card">
          <h1 className="display-md">Posting is not yours to do</h1>
          <p className="body measure">
            Your role at {school.name} does not include <code>post_jobs</code>.
            Somebody with user administration there can grant it, or post the
            role themselves.
          </p>
          <div className="su-actions">
            <Link className="su-btn su-btn-quiet" href="/dashboard/school">
              Back to the dashboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const verified = school.verificationStatus === "verified";

  return (
    <main className="dash-wrap">
      <header className="dash-top">
        <div className="dash-ident">
          <Link href="/dashboard/school" className="readout pf-back">
            &larr; Back to the dashboard
          </Link>
          <h1>Open a role</h1>
          <span className="readout">{school.name}</span>
        </div>
      </header>

      {!verified && (
        <p className="su-note" style={{ marginBottom: 20 }}>
          {school.name} is still waiting on us to verify it, so this role can
          be written and saved but <strong>not published</strong> yet. Nothing
          is lost — publishing is one click once the school is verified.
        </p>
      )}

      <PostingForm
        criteria={criteria.map((c) => ({
          id: c.id,
          label: c.label,
          shortLabel: c.shortLabel,
          description: c.description,
          measuredFrom: c.measuredFrom,
        }))}
        subjectOptions={subjects.map((o) => ({ id: o.id, label: o.label }))}
        specialismOptions={specialisms.map((o) => ({ id: o.id, label: o.label }))}
        canPublish={verified}
        rankingAllowed={rankingAllowed}
      />
    </main>
  );
}

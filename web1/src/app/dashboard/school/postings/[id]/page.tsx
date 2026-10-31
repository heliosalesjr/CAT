import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { schoolUserHas } from "@/lib/db/actors";
import { applicationsForPosting } from "@/lib/db/applications";
import { postingById } from "@/lib/db/postings";
import { currentActor } from "@/lib/session";
import { Pipeline } from "./Pipeline";

export const metadata: Metadata = { title: "Pipeline — Class Act Talent" };
export const dynamic = "force-dynamic";

export default async function PostingPage({
  params,
}: PageProps<"/dashboard/school/postings/[id]">) {
  const { id } = await params;

  const actor = await currentActor();
  if (!actor) redirect("/signup");
  if (actor.type !== "school_user") redirect("/dashboard/teacher");

  const posting = await postingById(id);
  // Not an authorisation check dressed as a lookup: a posting at another
  // school is simply not this person's to see, and saying "not found" tells
  // them nothing about whether it exists.
  if (!posting || posting.schoolId !== actor.schoolId) notFound();

  const [rows, canMove] = await Promise.all([
    applicationsForPosting(id),
    schoolUserHas(actor.id, "move_stage"),
  ]);

  return (
    <main className="dash-wrap">
      <header className="dash-top">
        <div className="dash-ident">
          <Link href="/dashboard/school/postings" className="readout pf-back">
            &larr; Back to your roles
          </Link>
          <h1>{posting.title}</h1>
          <span className="readout">
            {rows.length} application{rows.length === 1 ? "" : "s"} ·{" "}
            {posting.rankingCriteria.length} ranking criteria ·{" "}
            {posting.aiRankingEnabled ? "ordered by them" : "ordering off"}
          </span>
        </div>
      </header>

      {!canMove && (
        <p className="su-note">
          Your role does not include moving candidates through the pipeline, so
          this is read-only for you.
        </p>
      )}

      <section className="dash-section">
        <Pipeline rows={rows} canMove={canMove} />
      </section>
    </main>
  );
}

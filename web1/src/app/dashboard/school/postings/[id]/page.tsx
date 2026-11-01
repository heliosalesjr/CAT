import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { schoolUserHas } from "@/lib/db/actors";
import { applicationsForPosting, type PostingApplication } from "@/lib/db/applications";
import { postingById } from "@/lib/db/postings";
import { currentActor } from "@/lib/session";
import { signInPath } from "@/lib/next-path";
import { Pipeline } from "./Pipeline";

export const metadata: Metadata = { title: "Pipeline — Class Act Talent" };
export const dynamic = "force-dynamic";

const STATUS_WORD: Record<string, string> = {
  posted: "Live",
  draft: "Draft",
  on_hold: "Paused",
  closed: "Closed",
  archived: "Archived",
};

/** The order a pipeline runs in, for working out how far anybody has got. */
const ORDER = ["applied", "screening", "interview", "offer", "hired"] as const;

export default async function PostingPage({
  params,
}: PageProps<"/dashboard/school/postings/[id]">) {
  const { id } = await params;

  const actor = await currentActor();
  if (!actor) redirect(signInPath(`/dashboard/school/postings/${id}`));
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

  const owed = rows.filter((r) => r.schoolOwesResponse).length;
  const furthest = ORDER.reduce(
    (best, stage) => (rows.some((r) => r.stage === stage) ? stage : best),
    null as (typeof ORDER)[number] | null,
  );

  return (
    <main className="dash-wrap">
      <header className="dash-top">
        <div className="dash-ident">
          <Link href="/dashboard/school/postings" className="readout pf-back">
            &larr; Back to your roles
          </Link>
          <h1>{posting.title}</h1>
          <span className="readout">
            <span className={`chip chip-${posting.status === "posted" ? "positive" : "neutral"}`}>
              {STATUS_WORD[posting.status] ?? posting.status}
            </span>
            {" · "}
            {posting.rankingCriteria.length} ranking criteria,{" "}
            {posting.aiRankingEnabled ? "ordering on" : "ordering off"}
            {posting.applyByDate && ` · closes ${posting.applyByDate}`}
          </span>
        </div>
      </header>

      {rows.length > 0 && (
        <section className="dash-section" aria-label="Summary">
          <div className="strip">
            <div>
              <span className="label">Applications</span>
              <span className="fig">{rows.length}</span>
              <p className="strip-sub">
                {posting.openingsAvailable > 1
                  ? `for ${posting.openingsAvailable} openings`
                  : "for one opening"}
              </p>
            </div>
            <div data-bad={owed > 0 || undefined}>
              <span className="label">Waiting on you</span>
              <span className="fig">{owed}</span>
              <p className="strip-sub">
                {owed === 0 ? "everyone has had a reply" : "have not heard back yet"}
              </p>
            </div>
            <div>
              <span className="label">Furthest stage</span>
              <span className="fig" style={{ fontSize: 28 }}>
                {furthest ? STAGE_WORD[furthest] : "—"}
              </span>
              <p className="strip-sub">{reach(rows, furthest)}</p>
            </div>
          </div>
        </section>
      )}

      {!canMove && (
        <section className="dash-section" style={{ paddingBottom: 0 }}>
          <p className="note">
            Your role does not include moving candidates through the pipeline,
            so this is read-only for you. You can still see everybody.
          </p>
        </section>
      )}

      <Pipeline rows={rows} canMove={canMove} />
    </main>
  );
}

const STAGE_WORD: Record<string, string> = {
  applied: "Applied", screening: "Screening", interview: "Interview",
  offer: "Offer", hired: "Hired",
};

/** How many people are at the furthest point anybody has reached. */
function reach(rows: PostingApplication[], furthest: string | null): string {
  if (!furthest) return "nobody has moved yet";
  const n = rows.filter((r) => r.stage === furthest).length;
  return `${n} ${n === 1 ? "person is" : "people are"} there`;
}

import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { completenessBreakdown, isRankable } from "@/lib/db/candidates";
import { permissionsFor } from "@/lib/db/actors";
import { currentActor } from "@/lib/session";

export const metadata: Metadata = { title: "You are in — Class Act Talent" };

/**
 * The end of signup, and the first screen that shows a person their own real
 * record rather than a dashboard full of sample data.
 *
 * It exists because rule 6 has to be explained the moment it starts applying.
 * A candidate who has just created a profile is below the ranking threshold
 * and will stay there until they fill it in; telling them that here, with the
 * actual missing fields named, is the difference between a product that feels
 * broken and one that feels honest. The figures come from
 * `candidate_completeness_breakdown` — the same rows the ranking uses, so this
 * page cannot promise something the matching disagrees with.
 */
export default async function DonePage() {
  const actor = await currentActor();
  if (!actor) redirect("/signup");

  if (actor.type === "candidate") {
    const [lines, rankable] = await Promise.all([
      completenessBreakdown(actor.id),
      isRankable(actor.id),
    ]);
    const have = lines.filter((l) => l.present).reduce((s, l) => s + l.weight, 0);
    const missing = lines.filter((l) => !l.present).sort((a, b) => b.weight - a.weight);

    return (
      <div className="su-card">
        <span className="label label-teal">Your profile exists</span>
        <h1 className="display-md" style={{ marginBlock: "10px 0" }}>
          {have}% complete
        </h1>
        <p className="body measure">
          {rankable ? (
            <>Schools can rank you from here. Everything below still helps.</>
          ) : (
            <>
              Schools will not rank you until this passes the threshold — you
              are not scored low, you are held out of the ordering entirely,
              and shown separately instead. Here is exactly what closes the
              gap.
            </>
          )}
        </p>

        <ul className="su-list" style={{ listStyle: "none" }}>
          {missing.slice(0, 8).map((l) => (
            <li
              key={l.field}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 16,
                padding: "11px 15px",
                background: "var(--color-paper-2)",
                border: "1px solid var(--color-rule)",
              }}
            >
              <span style={{ fontSize: 14.5, color: "var(--color-navy)" }}>
                {FIELD_LABELS[l.field] ?? l.field}
              </span>
              <span className="readout">
                +{l.weight} &middot; {l.readsInto}
              </span>
            </li>
          ))}
        </ul>

        <div className="su-actions">
          <Link className="su-btn" href="/dashboard/teacher/profile">
            Fill in my profile
          </Link>
          <span className="readout">You can come back to it as often as you like</span>
        </div>
      </div>
    );
  }

  const permissions = await permissionsFor(actor.id);
  const pending = permissions.length === 0;

  return (
    <div className="su-card">
      <span className="label label-teal">{pending ? "Awaiting confirmation" : "You are in"}</span>
      <h1 className="display-md" style={{ marginBlock: "10px 0" }}>
        {pending ? "We need to confirm you first" : "Your school account is ready"}
      </h1>
      <p className="body measure">
        {pending ? (
          <>
            Your account exists and holds nothing yet — no candidate profiles,
            no documents, no posting. That is deliberate: a school account
            reaches real people&rsquo;s passports and references, so somebody
            confirms every one we cannot verify automatically. If a colleague
            is already here, an invitation from them is instant.
          </>
        ) : (
          <>
            Your work address matched your school&rsquo;s domain, so nothing is
            waiting on us.
          </>
        )}
      </p>

      <div className="su-actions">
        <Link className="su-btn" href="/dashboard/school">
          Go to the dashboard
        </Link>
      </div>
    </div>
  );
}

/** The same words the profile form uses, so the two screens agree. */
const FIELD_LABELS: Record<string, string> = {
  subjects_or_specialisms: "Subjects, or your specialism",
  curriculum_experience: "Curricula you have taught",
  role_family: "What kind of post you want",
  highest_degree: "Highest degree",
  available_from: "When you are available",
  grade_levels: "Grade levels",
  years_experience: "Years in the profession",
  preferred_regions: "Where you would go",
  regions_worked: "Where you have worked",
  nationality: "Nationality",
  headline: "Your headline",
  photo: "A photograph",
  years_in_subject: "Years in your specialism",
  salary_expectation: "Salary expectation",
  intro_video: "A short intro video",
  degree_field: "Field of your degree",
  languages: "Languages",
  coaching: "Coaching and activities",
};

import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { currentActor, currentIdentity } from "@/lib/session";
import { schoolOptionsForEmail } from "@/lib/signup";
import { CandidateFinish } from "./CandidateFinish";
import { SchoolFinish } from "./SchoolFinish";

export const metadata: Metadata = {
  title: "Finish signing up — Class Act Talent",
};

/**
 * Where the magic link lands.
 *
 * The `as` parameter is a hint and nothing more — it came back from a URL the
 * person could have edited. What decides the screen is the state: whether
 * anybody is signed in, whether they already have a profile, and for a school
 * user what their own email domain says. The hint only breaks the tie for
 * somebody who has none of those yet, and the worst it can do is show the
 * wrong form to a person who can go back and pick again.
 */
export default async function FinishPage({ searchParams }: PageProps<"/signup/finish">) {
  const { as } = await searchParams;

  const identity = await currentIdentity();
  if (!identity?.email) {
    return (
      <div className="su-card">
        <h1 className="display-md">That link has expired</h1>
        <p className="body measure">
          Sign-in links last fifteen minutes and work once. Nothing was lost —
          nothing is stored until a profile is created.
        </p>
        <div className="su-actions">
          <Link className="su-btn" href="/signup">
            Start again
          </Link>
        </div>
      </div>
    );
  }

  // Already finished. Decision 9 means there is exactly one place to go.
  const actor = await currentActor();
  if (actor) {
    redirect(actor.type === "candidate" ? "/dashboard/teacher" : "/dashboard/school");
  }

  if (as === "school") {
    const { matches, outcome } = await schoolOptionsForEmail(identity.email);
    return <SchoolFinish email={identity.email} matches={matches} outcome={outcome} />;
  }

  return <CandidateFinish email={identity.email} />;
}

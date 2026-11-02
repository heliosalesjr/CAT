import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getJobCards, getOfferContext, getCandidate, getCandidateApplications,
  getCandidateInterviews, getCandidateSummary,
} from "@/lib/dashboard-data";
import { Avatar } from "@/components/dashboard/Avatar";
import { Readiness } from "@/components/dashboard/Readiness";
import { MyApplications } from "@/components/dashboard/MyApplications";
import { Blockers } from "@/components/dashboard/Blockers";
import { Interviews } from "@/components/dashboard/Interviews";
import { JobSuggestions } from "@/components/dashboard/JobSuggestions";
import { TeacherSwitch } from "@/components/dashboard/TeacherSwitch";
import { EmptyStage } from "@/components/dashboard/EmptyStage";
import { candidateById } from "@/lib/db/candidates";
import {
  candidateApplicationCards,
  candidateDashboardSummary,
  candidateHasNothingYet,
  candidateOfferContext,
} from "@/lib/db/candidate-dashboard";
import { scalar } from "@/lib/db/client";
import type { CandidateSummary } from "@/lib/dashboard-data";
import { currentActor } from "@/lib/session";
import { signInPath } from "@/lib/next-path";

export const metadata = { title: "Your applications — Class Act Talent" };
export const dynamic = "force-dynamic";

/**
 * Two paths into the same screen, the way `/dashboard/school` does it: signed
 * in as a candidate you see your own record, and `?view=` renders the sample
 * bundle read-only for a sales conversation.
 *
 * Which path is the default is the whole point. This page used to render the
 * bundle unconditionally, so a teacher who had just created a profile landed
 * on Daniel's dashboard — his offer, his passport, his name in the header —
 * and read it as their own account. The school side had the identical bug and
 * the identical fix. A real account now gets its real state, including the
 * honest empty one, and the demo is somewhere you have to ask to go.
 */
export default async function TeacherDashboard({
  searchParams,
}: PageProps<"/dashboard/teacher">) {
  const { view } = (await searchParams) as { view?: string };
  if (view) return <Demo view={view} />;

  const actor = await currentActor();
  if (!actor) redirect(signInPath("/dashboard/teacher"));
  if (actor.type === "school_user") redirect("/dashboard/school");
  if (actor.type === "platform_user") redirect("/admin");

  const candidate = await candidateById(actor.id);
  if (!candidate) throw new Error(`signed in as a candidate that is gone: ${actor.id}`);

  // Nothing applied to, nothing uploaded, nobody named: the account exists and
  // that is all. Everything below this would be an empty shelf, so the page
  // becomes the one screen that says what a school checks and in what order.
  if (await candidateHasNothingYet(actor.id)) {
    return <FirstDay firstName={candidate.firstName} />;
  }

  const [summary, applications, offerContext, openRoles] = await Promise.all([
    candidateDashboardSummary(actor.id),
    candidateApplicationCards(actor.id),
    candidateOfferContext(actor.id),
    scalar<string>(
      `SELECT count(*) FROM job_postings
       WHERE status = 'posted' AND deleted_at IS NULL`,
    ),
  ]);

  const where = [candidate.currentCity, candidate.currentCountry].filter(Boolean).join(", ");

  return (
    <main className="dash-wrap">
      <header className="dash-top">
        <div className="tc-ident">
          <Avatar
            name={`${candidate.firstName} ${candidate.lastName}`}
            missing={!candidate.avatarUrl}
          />
          <div className="dash-ident">
            <span className="label">{candidate.currentSchool ?? "Not currently placed"}</span>
            <h1>{candidate.firstName} {candidate.lastName}</h1>
            <span className="readout">
              {[candidate.headline, where].filter(Boolean).join(" · ") ||
                "Your profile does not say what you do yet"}
            </span>
          </div>
        </div>
        <Link href="/dashboard/teacher/jobs" className="btn btn-quiet">
          Browse open roles
        </Link>
      </header>

      <section className="dash-section tc-top">
        <Readiness summary={summary} />
        <aside className="tc-top-aside">
          <p className="tc-standing">{standing(summary)}</p>
          <Link href="/dashboard/teacher/profile" className="btn btn-accent">
            {summary.profileCompleteness < 70 ? "Finish your profile" : "Edit your profile"}
          </Link>
        </aside>
      </section>

      <MyApplications rows={applications} offerContext={offerContext} />
      <Blockers summary={summary} />

      {/* Where the bundle shows ranked suggestions. There is no matching job
          yet, so this says what is actually on offer and sends them to the
          list rather than drawing an empty shelf of recommendations. */}
      <section className="dash-section" aria-labelledby="roles">
        <div className="dash-head">
          <h2 id="roles">Open roles</h2>
          <p>
            Nothing is being recommended to you yet — the matching that would
            order roles against your profile is not built. Until it is, this is
            every live role, newest first, each saying whether you can apply.
          </p>
        </div>
        <p className="queue-clear">
          {Number(openRoles) === 0 ? (
            "No school has a live role right now."
          ) : (
            <>
              {openRoles} live role{Number(openRoles) === 1 ? "" : "s"} ·{" "}
              <Link href="/dashboard/teacher/jobs">see them</Link>
            </>
          )}
        </p>
      </section>

      <footer className="dash-foot">
        <span className="readout">
          Your data · {applications.length} application
          {applications.length === 1 ? "" : "s"} ·{" "}
          <Link href="?view=daniel">see the sample dashboard</Link>
        </span>
      </footer>
    </main>
  );
}

/** One sentence answering "where do I stand". */
function standing(s: CandidateSummary) {
  if (s.offersOpen > 0)
    return "You have an offer open. Everything below is what stands between you and accepting it safely.";
  if (s.activeApplications > 0 && s.schoolsOwingResponse > 0)
    return `${s.schoolsOwingResponse} school owes you a reply. The rest is on your side.`;
  if (s.activeApplications > 0) return "Your application is with the school. Nothing is waiting on you.";
  return "Nothing in flight yet.";
}

/**
 * The first screen a real teacher sees, and the one a prospect is shown. The
 * demo reaches it through `?view=new`, which is the only version that carries
 * the viewer switch.
 */
function FirstDay({ firstName, switcher }: { firstName?: string; switcher?: boolean }) {
  return (
    <main className="dash-wrap">
      <header className="dash-top">
        <div className="tc-ident">
          <Avatar name={firstName ?? ""} missing />
          <div className="dash-ident">
            <h1>{firstName ? `Welcome, ${firstName}` : "Welcome"}</h1>
            <span className="readout">Account created</span>
          </div>
        </div>
        {switcher && <TeacherSwitch view="new" />}
      </header>

      <EmptyStage
        title="Schools filter before they read."
        blurb={
          "Teaching, leadership or student support — a school narrows a long list " +
          "on what your profile says about the role you want, the curricula you have " +
          "worked in and the ages you have worked with, before anyone opens a CV. " +
          "Documents and a supervisor's reference decide the gate after that."
        }
        actions={
          <>
            <Link href="/dashboard/teacher/profile" className="btn btn-accent">
              Start your profile
            </Link>
            <Link href="/dashboard/teacher/jobs" className="btn btn-quiet">
              Browse roles first
            </Link>
          </>
        }
        stepsTitle="What a school checks, in order"
        steps={[
          { h: "Say what you do",
            p: "The kind of role you want, your specialism, the curricula you have worked in, and the regions you would move to." },
          { h: "Upload what schools verify",
            p: "Passport, degree, teaching certificate. These are checked, not just stored." },
          { h: "Name a supervisor",
            p: "Someone who managed you, in any role. A reference from a peer rarely counts towards safeguarding." },
        ]}
      />
    </main>
  );
}

/* ------------------------------------------------------- the sample bundle */

const VIEWS: Record<string, string> = { daniel: "tch_0001", blocked: "tch_0009" };

/** The mockup, kept for demos. Nothing here touches the database. */
function Demo({ view }: { view: string }) {
  if (view === "new") return <FirstDay switcher />;

  const teacherId = VIEWS[view] ?? VIEWS.daniel;
  const t = getCandidate(teacherId);
  const summary = getCandidateSummary(teacherId);
  const applications = getCandidateApplications(teacherId);
  const interviews = getCandidateInterviews(teacherId);
  const recommended = getJobCards(summary.recommendedJobs.map((r) => r.jobPostingId));
  const saved = getJobCards(summary.savedJobIds);

  return (
    <main className="dash-wrap">
      <header className="dash-top">
        <div className="tc-ident">
          <Avatar name={`${t.firstName} ${t.lastName}`} missing={!t.avatarUrl} />
          <div className="dash-ident">
            <span className="label">{t.currentSchool ?? "Not currently placed"}</span>
            <h1>{t.firstName} {t.lastName}</h1>
            <span className="readout">
              {t.headline} · {t.currentCity}, {t.currentCountry}
            </span>
          </div>
        </div>
        <TeacherSwitch view={view} />
      </header>

      <section className="dash-section tc-top">
        <Readiness summary={summary} />
        <aside className="tc-top-aside">
          <p className="tc-standing">{standing(summary)}</p>
          <Link href={`/dashboard/teacher/profile?view=${view}`} className="btn btn-accent">
            {summary.profileCompleteness < 70 ? "Finish your profile" : "Edit your profile"}
          </Link>
        </aside>
      </section>

      <MyApplications rows={applications} offerContext={getOfferContext(teacherId)} />
      <Blockers summary={summary} />
      <Interviews rows={interviews} leadTimezone={t.timezone} perspective="teacher" />
      <JobSuggestions
        recommended={recommended}
        saved={saved}
        why={summary.recommendedJobs}
        emptyReason={
          summary.recommendedJobs.length === 0
            ? `Nothing is being suggested yet, and the reason is specific: at ${summary.profileCompleteness}% your profile does not say enough about the work you do for a match to mean anything. The role you want, your specialism, the curricula you have worked in and the regions you would move to are what the matching reads.`
            : null
        }
      />

      <footer className="dash-foot">
        <span className="readout">
          Sample data, not your account · figures as of 10 October 2026 ·{" "}
          <Link href="/dashboard/teacher">back to your own dashboard</Link>
        </span>
      </footer>
    </main>
  );
}

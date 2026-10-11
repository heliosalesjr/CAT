import Link from "next/link";
import {
  getJobCards, getTeacher, getTeacherApplications, getTeacherInterviews,
  getTeacherSummary,
} from "@/lib/dashboard-data";
import { Avatar } from "@/components/dashboard/Avatar";
import { Readiness } from "@/components/dashboard/Readiness";
import { MyApplications } from "@/components/dashboard/MyApplications";
import { Blockers } from "@/components/dashboard/Blockers";
import { Interviews } from "@/components/dashboard/Interviews";
import { JobSuggestions } from "@/components/dashboard/JobSuggestions";
import { TeacherSwitch } from "@/components/dashboard/TeacherSwitch";

export const metadata = { title: "Your applications — Class Act Talent" };
export const dynamic = "force-dynamic";

const VIEWS: Record<string, string> = { daniel: "tch_0001", blocked: "tch_0009" };

export default async function TeacherDashboard({
  searchParams,
}: PageProps<"/dashboard/teacher">) {
  const { view = "daniel" } = (await searchParams) as { view?: string };

  if (view === "new") return <FirstDay />;

  const teacherId = VIEWS[view] ?? VIEWS.daniel;
  const t = getTeacher(teacherId);
  const summary = getTeacherSummary(teacherId);
  const applications = getTeacherApplications(teacherId);
  const interviews = getTeacherInterviews(teacherId);
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
          <Link href="/dashboard/teacher/profile" className="btn btn-accent">
            {summary.profileCompleteness < 70 ? "Finish your profile" : "Edit your profile"}
          </Link>
        </aside>
      </section>

      <MyApplications rows={applications} />
      <Blockers summary={summary} />
      <Interviews rows={interviews} leadTimezone={t.timezone} perspective="teacher" />
      <JobSuggestions
        recommended={recommended}
        saved={saved}
        why={summary.recommendedJobs}
        emptyReason={
          summary.recommendedJobs.length === 0
            ? `Nothing is being suggested yet, and the reason is specific: at ${summary.profileCompleteness}% your profile does not say enough about what you teach for a match to mean anything. Subjects, curricula and the regions you would move to are what the matching reads.`
            : null
        }
      />

      <footer className="dash-foot">
        <span className="readout">Mock data · figures as of 10 October 2026</span>
      </footer>
    </main>
  );
}

/** One sentence answering "where do I stand". */
function standing(s: ReturnType<typeof getTeacherSummary>) {
  if (s.offersOpen > 0)
    return "You have an offer open. Everything below is what stands between you and accepting it safely.";
  if (s.activeApplications > 0 && s.schoolsOwingResponse > 0)
    return `${s.schoolsOwingResponse} school owes you a reply. The rest is on your side.`;
  if (s.activeApplications > 0) return "Your application is with the school. Nothing is waiting on you.";
  return "Nothing in flight yet.";
}

function FirstDay() {
  return (
    <main className="dash-wrap">
      <header className="dash-top">
        <div className="tc-ident">
          <Avatar name="New Teacher" missing />
          <div className="dash-ident">
            <h1>Welcome</h1>
            <span className="readout">Account created today</span>
          </div>
        </div>
        <TeacherSwitch view="new" />
      </header>

      <section className="dash-section empty">
        <div className="empty-lead">
          <h1>Schools find you by what you teach.</h1>
          <p>
            Three things decide whether a school can consider you: the subjects
            and curricula on your profile, verified documents, and a reference
            from someone who managed you. Nothing else moves until those do.
          </p>
          <div className="empty-actions">
            <Link href="/dashboard/teacher/profile" className="btn btn-accent">Start your profile</Link>
            <button type="button" className="btn btn-quiet">Browse roles first</button>
          </div>
        </div>
        <ol className="empty-steps panel panel-rows">
          {[
            { h: "Say what you teach", p: "Subjects, curricula, grade levels and the regions you would move to." },
            { h: "Upload what schools verify", p: "Passport, degree, teaching certificate. These are checked, not just stored." },
            { h: "Name a supervisor", p: "A reference from someone who managed you counts far more than one from a peer." },
          ].map((s, i) => (
            <li key={s.h}>
              <span className="empty-step-n num">{i + 1}</span>
              <span><strong>{s.h}</strong><span>{s.p}</span></span>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}

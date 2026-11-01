import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getInterviews, getPipeline, getQueue, getSchool, getShortlistSummaries,
  getSummary, getViewer,
} from "@/lib/dashboard-data";
import { HealthBar } from "@/components/dashboard/HealthBar";
import { AttentionQueue } from "@/components/dashboard/AttentionQueue";
import { Pipeline } from "@/components/dashboard/Pipeline";
import { Shortlist } from "@/components/dashboard/Shortlist";
import { Interviews } from "@/components/dashboard/Interviews";
import { Analytics } from "@/components/dashboard/Analytics";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { DemoSwitch } from "@/components/dashboard/DemoSwitch";
import { permissionsFor } from "@/lib/db/actors";
import { applicationsOwedResponse, type OwedApplication } from "@/lib/db/applications";
import { one } from "@/lib/db/client";
import { postingsWithPipeline, type PostingWithPipeline } from "@/lib/db/postings";
import type { Camelize, SchoolUsersRow, SchoolsRow } from "@/lib/db/schema";
import { currentActor } from "@/lib/session";
import { signInPath } from "@/lib/next-path";

export const metadata = { title: "School dashboard — Class Act Talent" };

export const dynamic = "force-dynamic";

/**
 * Two paths into the same screen, the way `/dashboard/teacher/profile` does
 * it: signed in as a school user you see your own school, and `?view=`
 * renders the sample bundle read-only for a sales conversation.
 *
 * Which path is the default matters more than it looks. This page used to
 * render the bundle unconditionally, so a school that had just signed up
 * landed on somebody else's candidates — and read it as their own account
 * being somehow already full. A real account now gets its real state,
 * including the honest empty one, and the demo is somewhere you have to ask
 * to go.
 */
export default async function SchoolDashboard({
  searchParams,
}: PageProps<"/dashboard/school">) {
  const { view } = (await searchParams) as { view?: string };
  if (view) return <Demo view={view} />;

  const actor = await currentActor();
  if (!actor) redirect(signInPath("/dashboard/school"));
  if (actor.type === "candidate") redirect("/dashboard/teacher");
  if (actor.type === "platform_user") redirect("/admin");

  const [school, me, permissions] = await Promise.all([
    one<SchoolsRow>(`SELECT * FROM schools WHERE id = $1`, [actor.schoolId]),
    one<SchoolUsersRow>(`SELECT * FROM school_users WHERE id = $1`, [actor.id]),
    permissionsFor(actor.id),
  ]);

  const firstName = me.firstName ?? me.email?.split("@")[0] ?? "there";
  const verified = school.verificationStatus === "verified";

  // Nothing about the school is read before this test, and the test is the
  // permission set the database resolved — not `verified_at`, which would be
  // this page's own second opinion on decision 8's rule.
  //
  // Somebody unconfirmed is not a colleague yet. They picked this school from
  // a list and their address did not prove it, so the names in a pipeline are
  // exactly what they must not be shown while that is still open.
  if (permissions.length === 0) {
    return (
      <main className="dash-wrap">
        <Chrome school={school} me={me} firstName={firstName} verified={verified} canPost={false} />
        <p className="note">
          <strong>We are still confirming that you work at {school.name}.</strong>{" "}
          Until someone has, your account can sign in and nothing more — not a
          restriction put on this screen, but the permissions you hold, which
          are none. You do not need to do anything; we will email you.
        </p>
        <section className="dash-section">
          <p className="queue-clear">
            Once you are confirmed, your school&rsquo;s roles and everyone
            waiting on a reply appear here.
          </p>
        </section>
      </main>
    );
  }

  const [postings, owed] = await Promise.all([
    postingsWithPipeline(actor.schoolId),
    applicationsOwedResponse(actor.schoolId),
  ]);
  const live = postings.filter((p) => p.status === "posted");
  const applications = postings.reduce((n, p) => n + total(p), 0);
  // One scale across every row, so the rails compare rather than each filling
  // itself. Without it a role with two applicants and a role with forty both
  // draw a full bar.
  const widest = Math.max(1, ...postings.map(total));

  return (
    <main className="dash-wrap">
      <Chrome school={school} me={me} firstName={firstName} verified={verified}
              canPost={permissions.includes("post_jobs")} />

      <NextStep
        schoolName={school.name}
        verified={verified}
        postings={postings}
        live={live.length}
        applications={applications}
        owed={owed.length}
      />

      <StatStrip applications={applications} owed={owed.length} live={live.length}
                 roles={postings.length} />

      <section className="dash-section" aria-labelledby="owed">
        <div className="dash-head">
          <h2 id="owed">Waiting on you</h2>
          <p>
            Ordered by how long they have waited, longest first. Moving someone
            along — or ending it with a reason they read — is what clears this.
          </p>
          {owed.length > 0 && (
            <span className="readout">
              {owed.length} {owed.length === 1 ? "person" : "people"}
            </span>
          )}
        </div>
        {owed.length === 0 ? (
          <p className="queue-clear">
            Nothing is waiting on you.
            {applications > 0 && " Every application has had a response."}
          </p>
        ) : (
          <ol className="panel panel-rows queue">
            {owed.map((a) => <Owed key={a.applicationId} a={a} />)}
          </ol>
        )}
      </section>

      <section className="dash-section" aria-labelledby="roles">
        <div className="dash-head">
          <h2 id="roles">Your roles</h2>
          <p>
            Each rail is the same length; how much is filled is this role&apos;s
            share of your busiest one. The shades are how far those people have
            got.
          </p>
          <StageLegend />
        </div>
        {postings.length === 0 ? (
          <p className="queue-clear">
            No roles yet. A role is the first thing a candidate sees of your
            school, so this is where it starts.
          </p>
        ) : (
          <div className="panel panel-rows">
            {postings.map((p) => (
              <Role key={p.id} p={p} widest={widest} />
            ))}
          </div>
        )}
      </section>

      <footer className="dash-foot">
        <span className="readout">
          Your data · {applications} application{applications === 1 ? "" : "s"} across{" "}
          {postings.length} role{postings.length === 1 ? "" : "s"} ·{" "}
          <Link href="?view=hr">see the sample dashboard</Link>
        </span>
      </footer>
    </main>
  );
}

function Chrome({
  school, me, firstName, verified, canPost,
}: {
  school: Camelize<SchoolsRow>;
  me: Camelize<SchoolUsersRow>;
  firstName: string;
  verified: boolean;
  canPost: boolean;
}) {
  return (
    <header className="dash-top">
      <div className="dash-ident">
        <span className="label">
          {school.name}
          {school.city && ` · ${school.city}`}
        </span>
        <h1>Hello, {firstName}</h1>
        <span className="readout">
          {me.title ?? ROLE_WORD[me.role] ?? me.role}
          {" · "}
          <span className={`chip chip-${verified ? "positive" : "neutral"}`}>
            {verified ? "school verified" : "school awaiting verification"}
          </span>
        </span>
      </div>
      {canPost && (
        <Link className="btn btn-accent" href="/dashboard/school/postings/new">
          Open a role
        </Link>
      )}
    </header>
  );
}

const ROLE_WORD: Record<string, string> = {
  hr: "HR",
  principal: "Principal",
  coordinator: "Coordinator",
};

const STATUS_WORD: Record<string, string> = {
  posted: "Live",
  draft: "Draft",
  on_hold: "Paused",
  closed: "Closed",
  archived: "Archived",
};

/**
 * One paragraph that says what to do now. The order of the tests is the order
 * the obstacles actually arrive, and each is a real state of the database
 * rather than a count: an unconfirmed person holds no permissions at all, an
 * unverified school cannot publish, a verified school with nothing posted
 * reaches nobody.
 */
function NextStep({
  schoolName, verified, postings, live, applications, owed,
}: {
  schoolName: string;
  verified: boolean;
  postings: PostingWithPipeline[];
  live: number;
  applications: number;
  owed: number;
}) {
  if (!verified) {
    return (
      <p className="note">
        <strong>{schoolName} is being verified.</strong> You can write roles
        now and save them as drafts; publishing waits until the check is done,
        because a live role is a promise to the candidates who apply to it.
      </p>
    );
  }
  if (postings.length === 0) {
    return (
      <p className="note">
        <strong>You are verified, and nothing is open yet.</strong>{" "}
        <Link href="/dashboard/school/postings/new">Open your first role</Link>{" "}
        — the ranking criteria you pick there, in order, are what decides how
        candidates reach you.
      </p>
    );
  }
  if (live === 0) {
    return (
      <p className="note">
        <strong>
          {postings.length} role{postings.length === 1 ? "" : "s"} written, none live.
        </strong>{" "}
        A draft is invisible outside your school.{" "}
        <Link href="/dashboard/school/postings">Publish one</Link> and candidates
        can start applying.
      </p>
    );
  }
  if (applications === 0) {
    return (
      <p className="note">
        <strong>
          {live} role{live === 1 ? "" : "s"} live, nobody has applied yet.
        </strong>{" "}
        Nothing is wrong. Applications arrive unscored for now — the ranking
        job that orders them is not built yet, so the pipeline is in the order
        people applied.
      </p>
    );
  }
  if (owed === 0) {
    return (
      <p className="note">
        <strong>Everybody has had a response.</strong> {applications} application
        {applications === 1 ? "" : "s"} across {live} live role
        {live === 1 ? "" : "s"}, and nothing is sitting unanswered.
      </p>
    );
  }
  return null;
}

/* The four stages somebody can be waiting in. `hired`, `rejected` and
   `withdrawn` are outcomes, not places, so they are counted in words under
   the bar rather than drawn in it. */
const ACTIVE = ["applied", "screening", "interview", "offer"] as const;

const STAGE_LABEL: Record<string, string> = {
  applied: "Applied", screening: "Screening", interview: "Interview", offer: "Offer",
};

const total = (p: PostingWithPipeline) =>
  p.applied + p.screening + p.interview + p.offer + p.hired + p.closed;

const active = (p: PostingWithPipeline) =>
  p.applied + p.screening + p.interview + p.offer;

const countOf = (p: PostingWithPipeline, stage: (typeof ACTIVE)[number]) => p[stage];

/**
 * Three figures, so the page opens on a shape instead of on a list.
 *
 * The middle one is deliberately the one that can be bad: everything else on
 * this screen is something the school did, and that is the one thing it owes.
 */
function StatStrip({
  applications, owed, live, roles,
}: {
  applications: number; owed: number; live: number; roles: number;
}) {
  return (
    <section className="dash-section" aria-label="Summary">
      <div className="strip">
        <div>
          <span className="label">Applications</span>
          <span className="fig">{applications}</span>
          <p className="strip-sub">
            across {roles} role{roles === 1 ? "" : "s"}
          </p>
        </div>
        <div data-bad={owed > 0 || undefined}>
          <span className="label">Waiting on you</span>
          <span className="fig">{owed}</span>
          <p className="strip-sub">
            {owed === 0 ? "nobody is unanswered" : "have not heard back yet"}
          </p>
        </div>
        <div>
          <span className="label">Live now</span>
          <span className="fig">{live}</span>
          <p className="strip-sub">
            {live === 0
              ? "nothing candidates can see"
              : `of ${roles} role${roles === 1 ? "" : "s"} written`}
          </p>
        </div>
      </div>
    </section>
  );
}

function StageLegend() {
  return (
    <span className="pipe-legend">
      {ACTIVE.map((s) => (
        <span key={s} className="readout">
          <span className="dot" style={{ background: `var(--stage-${s})` }} />
          {STAGE_LABEL[s]}
        </span>
      ))}
    </span>
  );
}

function Owed({ a }: { a: OwedApplication }) {
  const days = Math.floor((Date.now() - new Date(a.appliedAt).getTime()) / 86_400_000);
  // The same two thresholds the sample dashboard uses, so the real one does
  // not read differently from the one shown in a sales conversation.
  const severity = days >= 30 ? "critical" : days >= 14 ? "caution" : "neutral";

  return (
    <li className="queue-row" data-severity={severity}>
      <span className="queue-days num" aria-label={`${days} days`}>
        <strong>{days}</strong>
        <span className="readout">d</span>
      </span>
      <span className="queue-body">
        <span className="queue-who">{a.candidateName}</span>
        <span className="queue-what">
          {STAGE_LABEL[a.stage] ?? a.stage} · {a.postingTitle}
        </span>
        <span className="queue-context readout">
          {a.headline ??
            (a.notRankableReason === "profile_incomplete"
              ? "profile below the threshold, so unranked"
              : "awaiting ranking")}
        </span>
      </span>
      <Link className="btn btn-quiet queue-action"
            href={`/dashboard/school/postings/${a.postingId}`}>
        Open pipeline
      </Link>
    </li>
  );
}

function Role({ p, widest }: { p: PostingWithPipeline; widest: number }) {
  const n = active(p);
  const all = total(p);
  // Live and nobody applying is the only state worth an alarm. Everything
  // else here is either fine or the school's own choice.
  const severity = p.status === "posted" && all === 0 ? "critical"
    : p.owedResponse > 0 ? "caution"
    : "healthy";

  return (
    <article className="pipe-row" data-severity={severity}>
      <div className="pipe-head">
        <div className="pipe-title">
          <h3>{p.title}</h3>
          <span className="pipe-meta readout">
            {STATUS_WORD[p.status] ?? p.status}
            {" · "}{p.roleFamily.replace(/_/g, " ")}
            {p.hired > 0 && ` · ${p.hired} hired`}
            {p.closed > 0 && ` · ${p.closed} closed`}
          </span>
        </div>
        <Link href={`/dashboard/school/postings/${p.id}`} className="pipe-go">
          <span className="readout">
            {p.owedResponse > 0
              ? `${p.owedResponse} awaiting a reply`
              : all > 0 ? "Pipeline" : "Open the role"}
          </span>
          <span aria-hidden="true">&rarr;</span>
        </Link>
      </div>

      <div className="pipe-bar-wrap">
        <div className="pipe-rail" role="img"
             aria-label={n > 0
               ? `${all} applications: ` +
                 ACTIVE.map((s) => `${countOf(p, s)} ${STAGE_LABEL[s]}`).join(", ")
               : "No applications"}>
          {n > 0 && (
            <div className="pipe-fill" style={{ width: `${Math.max((all / widest) * 100, 3)}%` }}>
              {ACTIVE.map((s) =>
                countOf(p, s) > 0 ? (
                  <span key={s} style={{ width: `${(countOf(p, s) / n) * 100}%`,
                                         background: `var(--stage-${s})` }} />
                ) : null,
              )}
            </div>
          )}
        </div>

        <span className="pipe-counts num">
          {n > 0 ? (
            ACTIVE.filter((s) => countOf(p, s) > 0).map((s) => (
              <span key={s}>
                <b>{countOf(p, s)}</b> <span className="readout">{STAGE_LABEL[s]}</span>
              </span>
            ))
          ) : (
            <span className="pipe-empty readout">
              {p.status === "posted" ? "Nobody has applied" : "Not published yet"}
            </span>
          )}
          <span className="pipe-share readout">
            <b className="num">{all}</b> applied
          </span>
        </span>
      </div>
    </article>
  );
}

/* ------------------------------------------------------- the sample bundle */

/** The mockup, kept for demos. Nothing here touches the database. */
function Demo({ view }: { view: string }) {
  const school = getSchool(SCHOOL_ID);

  if (view === "empty") {
    return (
      <main className="dash-wrap">
        <DemoChrome school={PROSPECT.school} viewerName={PROSPECT.name}
                   viewerTitle={PROSPECT.title} asOf={null} view={view} greeting="Welcome" />
        <EmptyState />
      </main>
    );
  }

  const viewer = getViewer(view === "coordinator" ? "usr_his_coord" : "usr_his_hr");
  const summary = getSummary(SCHOOL_ID);
  const queue = getQueue(SCHOOL_ID);
  const pipeline = getPipeline(SCHOOL_ID);
  const interviews = getInterviews(SCHOOL_ID);
  const shortlists = getShortlistSummaries(SCHOOL_ID);

  return (
    <main className="dash-wrap">
      <DemoChrome school={school.name} viewerName={viewer.name} viewerTitle={viewer.title}
                 asOf={summary.asOf} view={view} />

      <HealthBar summary={summary} />
      <AttentionQueue items={queue} />
      <Pipeline rows={pipeline} canSeeSalary={viewer.can("view_salary")} />
      <Shortlist summaries={shortlists}
                 canEditCriteria={viewer.can("edit_ranking_criteria")} />
      <Interviews rows={interviews} leadTimezone={school.timezone} perspective="school" />
      <Analytics summary={summary} />

      {/* Billing belongs to whoever holds manage_billing. For everyone else
          the zone is absent, not locked. */}
      {viewer.can("manage_billing") && (
        <section className="dash-section plan">
          <span className="label">Plan</span>
          <p className="num">
            {summary.planUsage.jobPostingsUsed} of {summary.planUsage.jobPostingLimit} postings
            used · {summary.planUsage.seatsUsed} of {summary.planUsage.seats} seats ·{" "}
            {summary.planUsage.subscriptionStatus}
          </p>
        </section>
      )}

      <footer className="dash-foot">
        <span className="readout">
          Sample data, not your school · {summary.totalApplications} applications across{" "}
          {summary.openPostings + summary.draftPostings + summary.onHoldPostings} postings ·{" "}
          <Link href="/dashboard/school">back to your own dashboard</Link>
        </span>
      </footer>
    </main>
  );
}

const SCHOOL_ID = "sch_hangang";
/** The prospect in the empty state is not Hangang; it has no records at all. */
const PROSPECT = { school: "Riverbend International Academy", name: "Amara Osei", title: "Director of HR" };

function DemoChrome({
  school, viewerName, viewerTitle, asOf, view, greeting: override,
}: {
  school: string; viewerName: string; viewerTitle: string;
  asOf: string | null; view: string; greeting?: string;
}) {
  return (
    <header className="dash-top">
      <div className="dash-ident">
        <span className="label">{school}</span>
        <h1>
          {override ?? greeting()}, {viewerName.split(" ")[0]}
        </h1>
        <span className="readout">
          {viewerTitle}
          {asOf && ` · ${new Date(asOf).toLocaleDateString("en-GB", {
            weekday: "long", day: "numeric", month: "long",
          })}`}
        </span>
      </div>
      <DemoSwitch view={view} />
    </header>
  );
}

/** The brief puts her here mid-cycle on a Monday morning. A brand-new account
    has no cycle to be mid-way through, so that framing is overridden there. */
function greeting() {
  return "Monday morning";
}

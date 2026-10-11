import {
  getInterviews, getPipeline, getQueue, getSchool, getShortlist, getSummary, getViewer,
} from "@/lib/dashboard-data";
import { HealthBar } from "@/components/dashboard/HealthBar";
import { AttentionQueue } from "@/components/dashboard/AttentionQueue";
import { Pipeline } from "@/components/dashboard/Pipeline";
import { Shortlist } from "@/components/dashboard/Shortlist";
import { Interviews } from "@/components/dashboard/Interviews";
import { Analytics } from "@/components/dashboard/Analytics";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { DemoSwitch } from "@/components/dashboard/DemoSwitch";

export const metadata = { title: "School dashboard — Class Act Talent" };

/** Read fresh so the demo switch takes effect without a rebuild. */
export const dynamic = "force-dynamic";

const SCHOOL_ID = "sch_hangang";
/** The prospect in the empty state is not Hangang; it has no records at all. */
const PROSPECT = { school: "Riverbend International Academy", name: "Amara Osei", title: "Director of HR" };
/** The posting the queue is worst on — the one the shortlist opens to. */
const FOCUS_POSTING = "job_his_mathco";

export default async function SchoolDashboard({
  searchParams,
}: PageProps<"/dashboard/school">) {
  const { view = "hr" } = (await searchParams) as { view?: string };
  const school = getSchool(SCHOOL_ID);

  if (view === "empty") {
    return (
      <main className="dash-wrap">
        <Chrome school={PROSPECT.school} viewerName={PROSPECT.name}
                viewerTitle={PROSPECT.title} asOf={null} view={view} />
        <EmptyState />
      </main>
    );
  }

  const viewer = getViewer(view === "coordinator" ? "usr_his_coord" : "usr_his_hr");
  const summary = getSummary(SCHOOL_ID);
  const queue = getQueue(SCHOOL_ID);
  const pipeline = getPipeline(SCHOOL_ID);
  const interviews = getInterviews(SCHOOL_ID);
  const shortlist = getShortlist(FOCUS_POSTING);

  return (
    <main className="dash-wrap">
      <Chrome school={school.name} viewerName={viewer.name} viewerTitle={viewer.title}
              asOf={summary.asOf} view={view} />

      <HealthBar summary={summary} />
      <AttentionQueue items={queue} />
      <Pipeline rows={pipeline} canSeeSalary={viewer.can("view_salary")} />
      <Shortlist data={shortlist}
                 canEditCriteria={viewer.can("edit_ranking_criteria")}
                 canSeeDocuments={viewer.can("view_documents")} />
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
          Mock data · {summary.totalApplications} applications across{" "}
          {summary.openPostings + summary.draftPostings + summary.onHoldPostings} postings
        </span>
      </footer>
    </main>
  );
}

function Chrome({
  school, viewerName, viewerTitle, asOf, view,
}: {
  school: string; viewerName: string; viewerTitle: string; asOf: string | null; view: string;
}) {
  return (
    <header className="dash-top">
      <div className="dash-ident">
        <span className="label">{school}</span>
        <h1>
          {greeting()}, {viewerName.split(" ")[0]}
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

/** The brief puts her here on a Monday morning. */
function greeting() {
  return "Monday morning";
}

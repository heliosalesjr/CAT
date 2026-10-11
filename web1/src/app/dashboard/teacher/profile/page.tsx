import Link from "next/link";
import {
  getCandidate, getCandidateDocuments, getCandidateReferences, getCandidateRecord,
  getCandidateSummary,
} from "@/lib/dashboard-data";
import { Avatar } from "@/components/dashboard/Avatar";
import { ProfileForm } from "@/components/dashboard/ProfileForm";

export const metadata = { title: "Your profile — Class Act Talent" };
export const dynamic = "force-dynamic";

const VIEWS: Record<string, string> = { daniel: "tch_0001", blocked: "tch_0009" };

export default async function ProfilePage({
  searchParams,
}: PageProps<"/dashboard/teacher/profile">) {
  const { view = "daniel" } = (await searchParams) as { view?: string };
  const teacherId = VIEWS[view] ?? VIEWS.daniel;

  const t = getCandidate(teacherId);
  const record = getCandidateRecord(teacherId);
  const summary = getCandidateSummary(teacherId);
  const documents = getCandidateDocuments(teacherId);
  const references = getCandidateReferences(teacherId);

  return (
    <main className="dash-wrap">
      <header className="dash-top">
        <div className="tc-ident">
          <Avatar name={`${t.firstName} ${t.lastName}`} missing={!t.avatarUrl} />
          <div className="dash-ident">
            <Link href={`/dashboard/teacher?view=${view}`} className="readout pf-back">
              &larr; Back to your applications
            </Link>
            <h1>Your profile</h1>
            <span className="readout">
              {summary.profileCompleteness}% complete ·{" "}
              {summary.profileCompleteness >= 70
                ? "above the ranking threshold"
                : "below the 70% schools' ranking needs"}
            </span>
          </div>
        </div>
      </header>

      <ProfileForm
        record={record}
        documents={documents}
        references={references}
        completeness={summary.profileCompleteness}
        hasPhoto={Boolean(t.avatarUrl)}
        name={`${t.firstName} ${t.lastName}`}
      />
    </main>
  );
}

import Link from "next/link";
import { Avatar } from "@/components/dashboard/Avatar";
import { ProfileForm } from "@/components/dashboard/ProfileForm";
import {
  candidateById,
  documentsFor,
  practiceOptions,
  referencesFor,
  roleFamiliesFor,
} from "@/lib/db/candidates";
import {
  getCandidate,
  getCandidateDocuments,
  getCandidateReferences,
  getCandidateRecord,
  getCandidateSummary,
} from "@/lib/dashboard-data";
import { currentActor } from "@/lib/session";
import { saveProfile } from "./actions";

export const metadata = { title: "Your profile — Class Act Talent" };
export const dynamic = "force-dynamic";

const VIEWS: Record<string, string> = { daniel: "tch_0001", blocked: "tch_0009" };

/**
 * Two paths into the same form.
 *
 * Signed in as a candidate, it is their own record and it saves. Otherwise it
 * is the `?view=` demo — the sample bundle, read-only — which is kept because
 * it shows the product to a school without anybody creating an account, and
 * that is worth money in a sales conversation. The form is the same component
 * either way; what differs is where the values come from and whether a save
 * action was handed in.
 */
export default async function ProfilePage({
  searchParams,
}: PageProps<"/dashboard/teacher/profile">) {
  const actor = await currentActor();

  // The vocabulary comes from practice_catalog in both paths. A picker that
  // offers only catalogued values is what keeps "Maths" from ever being typed.
  const [subjectOptions, specialismOptions] = await Promise.all([
    practiceOptions("subject"),
    practiceOptions("specialism"),
  ]);
  const options = {
    subjectOptions: subjectOptions.map((o) => ({ id: o.id, label: o.label })),
    specialismOptions: specialismOptions.map((o) => ({ id: o.id, label: o.label })),
  };

  if (actor?.type === "candidate") {
    const [candidate, families, documents, references] = await Promise.all([
      candidateById(actor.id),
      roleFamiliesFor(actor.id),
      documentsFor(actor.id),
      referencesFor(actor.id),
    ]);
    if (!candidate) throw new Error(`signed in as a candidate that is gone: ${actor.id}`);

    const name = `${candidate.firstName} ${candidate.lastName}`;
    return (
      <main className="dash-wrap">
        <Header
          name={name}
          hasPhoto={Boolean(candidate.avatarUrl)}
          completeness={candidate.profileCompleteness}
          backHref="/dashboard/teacher"
        />
        <ProfileForm
          profile={candidate as unknown as Record<string, unknown>}
          documents={documents}
          references={references}
          completeness={candidate.profileCompleteness}
          hasPhoto={Boolean(candidate.avatarUrl)}
          name={name}
          roleFamilies={families}
          save={saveProfile}
          {...options}
        />
      </main>
    );
  }

  const { view = "daniel" } = (await searchParams) as { view?: string };
  const candidateId = VIEWS[view] ?? VIEWS.daniel;
  const t = getCandidate(candidateId);
  const summary = getCandidateSummary(candidateId);

  return (
    <main className="dash-wrap">
      <Header
        name={`${t.firstName} ${t.lastName}`}
        hasPhoto={Boolean(t.avatarUrl)}
        completeness={summary.profileCompleteness}
        backHref={`/dashboard/teacher?view=${view}`}
      />
      <ProfileForm
        profile={getCandidateRecord(candidateId)}
        documents={getCandidateDocuments(candidateId)}
        references={getCandidateReferences(candidateId)}
        completeness={summary.profileCompleteness}
        hasPhoto={Boolean(t.avatarUrl)}
        name={`${t.firstName} ${t.lastName}`}
        roleFamilies={[]}
        {...options}
      />
    </main>
  );
}

function Header({
  name,
  hasPhoto,
  completeness,
  backHref,
}: {
  name: string;
  hasPhoto: boolean;
  completeness: number;
  backHref: string;
}) {
  return (
    <header className="dash-top">
      <div className="tc-ident">
        <Avatar name={name} missing={!hasPhoto} />
        <div className="dash-ident">
          <Link href={backHref} className="readout pf-back">
            &larr; Back to your applications
          </Link>
          <h1>Your profile</h1>
          <span className="readout">
            {completeness}% complete ·{" "}
            {completeness >= 70
              ? "above the ranking threshold"
              : "below the threshold schools' ranking needs"}
          </span>
        </div>
      </div>
    </header>
  );
}

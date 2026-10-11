import { EmptyStage } from "./EmptyStage";

/**
 * The brand-new school. Shown to prospects, so it has to read as a product
 * waiting to start rather than one that is broken: no chart skeletons, no
 * zeroed tiles, no dashes where numbers should be.
 */
export function EmptyState({ schoolName }: { schoolName?: string }) {
  return (
    <EmptyStage
      label={schoolName}
      title="Your first posting is the only thing missing."
      blurb={
        "Once a vacancy is live this page becomes a triage queue: who is waiting on " +
        "you, which posting is stalling, and who the ranking puts in front \u2014 with " +
        "the reasoning shown, every time."
      }
      actions={
        <>
          <button type="button" className="btn btn-accent">Post a vacancy</button>
          <button type="button" className="btn btn-quiet">Invite a colleague</button>
        </>
      }
      stepsTitle="Three steps to a live vacancy"
      steps={[
        { h: "Describe the role",
          p: "Subjects, division, curriculum, contract length and how certain the vacancy is." },
        { h: "Say what matters most",
          p: "Order three to five priorities. Candidates sort to match, and you can change your mind later." },
        { h: "Answer people",
          p: "Every applicant gets a reply. That is the part the rest of this industry skips." },
      ]}
    />
  );
}

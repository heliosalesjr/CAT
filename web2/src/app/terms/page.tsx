import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Terms of service — Class Act Talent",
  description:
    "The terms covering teacher accounts, school plans, verification, and what happens when either side leaves.",
};

export default function Terms() {
  return (
    <LegalPage
      title="Terms of service"
      updated="29 September 2026"
      intro="A working draft, written while the product is being built and subject to review by counsel before the platform opens."
      sections={[
        {
          heading: "Accounts",
          body: [
            "Teacher accounts are free and stay free. You are responsible for the accuracy of what you put in your profile, including the referees you name.",
            "School accounts run on a plan priced by total student enrollment rather than per posting. Users within a school hold different permissions depending on their role.",
          ],
        },
        {
          heading: "Verification",
          body: [
            "We verify a school as an institution before its postings go live. We request references from the supervisor at the school a candidate names, and we show the status of each request to both sides.",
            "A reference that has not been confirmed is labelled as such. We do not describe anything as verified before it is.",
          ],
        },
        {
          heading: "What we do not promise",
          body: [
            "We do not guarantee a placement, a shortlist, or a reply within any particular time. We do ask schools for a reason when an application goes quiet, and we pass that reason to the candidate.",
          ],
        },
        {
          heading: "Ending it",
          body: [
            "You can close a teacher account at any time from inside the product. A school plan runs to the end of its current term and is not renewed automatically without notice.",
          ],
        },
      ]}
    />
  );
}

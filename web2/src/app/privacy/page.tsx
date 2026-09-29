import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Privacy policy — Class Act Talent",
  description:
    "What Class Act Talent collects, where sensitive documents are kept, who can open them, and how to export or delete everything.",
};

export default function Privacy() {
  return (
    <LegalPage
      title="Privacy policy"
      updated="29 September 2026"
      intro="This is a working draft written while the product is being built. It describes what we intend to do and will be reviewed by counsel before the platform opens."
      sections={[
        {
          heading: "What we collect",
          body: [
            "For teachers: the profile you build, the curricula you have taught, your work history, the documents you upload, the referees you name, and the applications you send.",
            "For schools: the institution details we verify, the users you add and the permissions you give them, your postings, and the notes your team writes on candidates.",
          ],
        },
        {
          heading: "Where documents live",
          body: [
            "Passports, diplomas and certificates go into storage kept apart from the rest of the product. They are reached through links that expire, never through public URLs.",
            "Every time somebody opens one of those documents we record who it was and when. You can ask us for that record.",
          ],
        },
        {
          heading: "Who can see your profile",
          body: [
            "You choose: public, private, or visible only to the schools you have applied to. A school shortlist is never shown to the candidates on it.",
          ],
        },
        {
          heading: "Export and deletion",
          body: [
            "You can export everything we hold about you, or delete your account and its contents, from inside the product. It is not a form and not a support ticket, and it works in every market we operate in.",
            "Some records are kept after deletion where the law requires it, such as invoices. We will tell you which.",
          ],
        },
        {
          heading: "What we do not do",
          body: [
            "We do not sell your data, and we do not use your documents to train models.",
          ],
        },
      ]}
    />
  );
}

import type { Metadata } from "next";
import { StartForm } from "./StartForm";

export const metadata: Metadata = {
  title: "Create an account — Class Act Talent",
  description: "Join as an education professional, or for your school.",
};

export default function SignupPage() {
  return (
    <>
      <header style={{ maxWidth: "34rem", marginBottom: 28 }}>
        <span className="label label-teal">Create an account</span>
        <h1 className="display-md" style={{ marginBlock: "10px 12px" }}>
          Which side are you on?
        </h1>
        <p className="lede">
          It decides what we ask next, and not much else — the two sides of this
          platform never see the same screens.
        </p>
      </header>
      <StartForm />
    </>
  );
}

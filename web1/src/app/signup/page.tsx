import type { Metadata } from "next";
import { safeNext } from "@/lib/next-path";
import { StartForm } from "./StartForm";

export const metadata: Metadata = {
  title: "Create an account — Class Act Talent",
  description: "Join as an education professional, or for your school.",
};

/**
 * One door for both signing up and signing in, because a magic link cannot
 * tell them apart: the address either has an account behind it or it does
 * not, and the link finds out. What this page has to do is stop the two from
 * reading as the same event when they are not.
 *
 * `next` is the destination somebody was bounced off. Saying so matters more
 * than it sounds — without it, typing `/admin` while signed out lands you on
 * a form headed "Create an account" with nothing connecting the two, and it
 * looks like the URL was ignored.
 */
export default async function SignupPage({
  searchParams,
}: PageProps<"/signup">) {
  const next = safeNext((await searchParams).next);

  return (
    <>
      <header style={{ maxWidth: "34rem", marginBottom: 28 }}>
        <span className="label label-teal">
          {next ? "Sign in" : "Create an account"}
        </span>
        <h1 className="display-md" style={{ marginBlock: "10px 12px" }}>
          {next ? "You need to be signed in" : "Which side are you on?"}
        </h1>
        {next ? (
          <p className="lede">
            <code>{next}</code> is behind a sign-in. Use the address you already
            have an account on and the link will take you straight there — the
            two choices below only decide what we ask next if this address is
            new to us.
          </p>
        ) : (
          <p className="lede">
            It decides what we ask next, and not much else — the two sides of
            this platform never see the same screens.
          </p>
        )}
      </header>
      <StartForm next={next} />
    </>
  );
}

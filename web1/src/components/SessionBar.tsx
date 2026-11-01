import Link from "next/link";
import { actorForIdentity } from "@/lib/db/actors";
import { maybeOne } from "@/lib/db/client";
import { currentIdentity } from "@/lib/session";
import { signOutAction } from "./session-actions";

/**
 * Who you are signed in as, and the way out.
 *
 * It renders nothing when nobody is signed in, so it can sit in a layout
 * without the signed-out pages growing a strip that says "signed out".
 *
 * The reason it says the actor and not just the address: one identity is
 * exactly one actor, and while three sides are being tested from one browser
 * the question that actually comes up is not "am I signed in" but "which of
 * the three am I". The two states that look identical without it are a
 * finished school user and an identity whose signup stopped half way —
 * Auth.js has a `users` row and nothing hangs off it.
 */
export async function SessionBar() {
  const identity = await currentIdentity();
  if (!identity) return null;

  const actor = await actorForIdentity(identity.id);
  const where = actor?.type === "school_user"
    ? await maybeOne<{ name: string; role: string }>(
        `SELECT s.name, u.role::text FROM school_users u
         JOIN schools s ON s.id = u.school_id WHERE u.id = $1`,
        [actor.id],
      )
    : null;

  const label = !actor
    ? "signup unfinished"
    : actor.type === "candidate"
      ? "Candidate"
      : actor.type === "platform_user"
        ? "Platform staff"
        : where
          ? `${ROLE_WORD[where.role] ?? where.role} · ${where.name}`
          : "School";

  const home = !actor
    ? { href: "/signup/finish", text: "Finish signing up" }
    : actor.type === "candidate"
      ? { href: "/dashboard/teacher", text: "Your dashboard" }
      : actor.type === "platform_user"
        ? { href: "/admin", text: "Platform queues" }
        : { href: "/dashboard/school", text: "Your dashboard" };

  return (
    <div className="sbar">
      <span className="sbar-who">
        <span className="sbar-tag" data-unfinished={!actor || undefined}>{label}</span>
        <span className="sbar-mail">{identity.email ?? identity.id}</span>
      </span>
      <span className="sbar-acts">
        <Link href={home.href}>{home.text}</Link>
        <form action={signOutAction}>
          <button type="submit">Sign out</button>
        </form>
      </span>
    </div>
  );
}

const ROLE_WORD: Record<string, string> = {
  hr: "HR",
  principal: "Principal",
  coordinator: "Coordinator",
};

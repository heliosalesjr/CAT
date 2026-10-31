"use server";

import { revalidatePath } from "next/cache";
import { applyToPosting } from "@/lib/db/applications";
import { currentActor } from "@/lib/session";

export type ApplyState = { ok: string } | { error: string } | null;

/**
 * The candidate id comes from the session. Every reason an application can be
 * refused — a closed role, a work permit, a second application — is decided by
 * `why_cannot_apply` inside the database, and its message is written to be
 * read by the person it refuses.
 */
export async function applyAction(_prev: ApplyState, form: FormData): Promise<ApplyState> {
  const actor = await currentActor();
  if (!actor) return { error: "You are signed out. Sign in and try again." };
  if (actor.type !== "candidate") {
    return { error: "Only a candidate can apply to a role." };
  }

  const postingId = String(form.get("postingId") ?? "");
  const title = String(form.get("title") ?? "that role");

  try {
    await applyToPosting({
      candidateId: actor.id,
      postingId,
      coverLetter: form.get("coverLetter") === "on",
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not apply." };
  }

  revalidatePath("/dashboard/teacher/jobs");
  return { ok: `Applied to ${title}. The school owes you an answer.` };
}

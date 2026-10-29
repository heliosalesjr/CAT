"use server";

import { redirect } from "next/navigation";
import { createPosting, planAllowsRanking } from "@/lib/db/postings";
import { schoolUserHas } from "@/lib/db/actors";
import { parsePostingForm, type PostingProblem } from "@/lib/posting-fields";
import { currentActor } from "@/lib/session";

export type PostingState = { problems: PostingProblem[] } | { error: string } | null;

/**
 * The school id and the author both come from the session. A form field
 * naming either would let somebody post a role at a school they do not work
 * at — and the trigger in 0021 would catch it, but an error page is a worse
 * answer than never offering the field.
 */
export async function createPostingAction(
  _prev: PostingState,
  form: FormData,
): Promise<PostingState> {
  const actor = await currentActor();
  if (!actor) return { error: "You are signed out. Sign in and try again." };
  if (actor.type !== "school_user") {
    return { error: "Only a school user can post a role." };
  }
  if (!(await schoolUserHas(actor.id, "post_jobs"))) {
    return {
      error:
        "Your role does not include posting. Ask somebody with user administration " +
        "at your school to give you the permission, or to post it for you.",
    };
  }

  const parsed = parsePostingForm(form);
  if (!parsed.ok) return { problems: parsed.problems };

  // The plan is the ceiling: a posting may switch ranking off, never on when
  // the plan withholds it (0009). Asked here so the refusal is a sentence
  // rather than a constraint name.
  const wantsRanking = form.get("aiRankingEnabled") === "on";
  const allowed = await planAllowsRanking(actor.schoolId);

  let posting;
  try {
    posting = await createPosting({
      schoolId: actor.schoolId,
      createdById: actor.id,
      aiRankingEnabled: wantsRanking && allowed,
      posting: parsed.input,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not create the role.";
    return { error: message.replace(/^job_posting [^:]*:\s*/, "") };
  }

  redirect(`/dashboard/school/postings?created=${posting.id}`);
}

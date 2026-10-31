"use server";

import { revalidatePath } from "next/cache";
import { moveApplicationStage } from "@/lib/db/applications";
import type { ApplicationStage } from "@/lib/db/schema";
import { currentActor } from "@/lib/session";

export type MoveState = { ok: string } | { error: string } | null;

const STAGES = new Set<string>([
  "applied", "screening", "interview", "offer", "hired", "rejected", "withdrawn",
]);

/**
 * Moving one person one step. The permission, the school and the legality of
 * the transition are all the database's to decide — `move_application_stage`
 * refuses anything else, and its messages are sentences.
 */
export async function moveStageAction(_prev: MoveState, form: FormData): Promise<MoveState> {
  const actor = await currentActor();
  if (!actor) return { error: "You are signed out. Sign in and try again." };
  if (actor.type !== "school_user") return { error: "Only a school user moves a pipeline." };

  const to = String(form.get("to") ?? "");
  if (!STAGES.has(to)) return { error: "That is not a stage." };

  const applicationId = String(form.get("applicationId") ?? "");
  const who = String(form.get("who") ?? "the candidate");
  const reason = String(form.get("reason") ?? "").trim();

  try {
    await moveApplicationStage({
      schoolUserId: actor.id,
      applicationId,
      to: to as ApplicationStage,
      reason: reason || undefined,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not move it." };
  }

  revalidatePath(`/dashboard/school/postings`);
  return { ok: `${who} is now at ${to.replace("_", " ")}.` };
}

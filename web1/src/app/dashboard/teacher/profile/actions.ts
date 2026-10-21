"use server";

import { revalidatePath } from "next/cache";
import { applyProfileSave } from "@/lib/profile-save";
import type { ProfileSaveState } from "@/lib/profile-fields";
import { currentActor } from "@/lib/session";

export type SaveState = ProfileSaveState;

/**
 * The transport. Two things here need a request and so cannot live in
 * `applyProfileSave`: whose profile this is, and which pages to rebuild.
 *
 * The candidate id comes from the session, never from the form. A profile
 * editor that took an id from a field would let anybody rewrite anybody's
 * profile, which is the sort of hole somebody else finds.
 */
export async function saveProfile(_prev: SaveState, form: FormData): Promise<SaveState> {
  const actor = await currentActor();
  if (!actor) return { status: "error", message: "You are signed out. Sign in and try again." };
  if (actor.type !== "candidate") {
    return { status: "error", message: "Only a candidate has a profile to edit." };
  }

  const result = await applyProfileSave(actor.id, form);

  if (result?.status === "saved") {
    revalidatePath("/dashboard/teacher/profile");
    revalidatePath("/dashboard/teacher");
  }
  return result;
}

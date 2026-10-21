import "server-only";
import { completenessBreakdown, setRoleFamilies, updateCandidate } from "./db/candidates.ts";
import { parseProfileForm, type ProfileSaveState } from "./profile-fields.ts";

/**
 * Saving a profile, with no request around it.
 *
 * Split out of the server action for the same reason the signup rules are:
 * an action can only be reached by driving the framework's RSC protocol, and
 * a rule that can only be tested through a browser is a rule that stops being
 * tested. The action is left holding the two things that genuinely need a
 * request — whose session this is, and which pages to revalidate.
 */
export async function applyProfileSave(
  candidateId: string,
  form: FormData,
): Promise<ProfileSaveState> {
  const { patch, families, problems } = parseProfileForm(form);
  if (problems.length) return { status: "invalid", problems };

  try {
    await updateCandidate(candidateId, patch);
    // Null means this submission did not carry the question, so the existing
    // answer stands — the form posts a marker when it did.
    if (families) await setRoleFamilies(candidateId, families);
  } catch (err) {
    // Database refusals arrive here with messages written to be read: a
    // subject outside the catalog, a field that is not editable, a salary
    // range that runs backwards.
    const message = err instanceof Error ? err.message : "Could not save.";
    return { status: "error", message: message.replace(/^[a-z_]+\([^)]*\):\s*/, "") };
  }

  const lines = await completenessBreakdown(candidateId);
  const completeness = lines.filter((l) => l.present).reduce((s, l) => s + l.weight, 0);
  return { status: "saved", completeness, at: Date.now() };
}

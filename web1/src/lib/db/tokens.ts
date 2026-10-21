import "server-only";
import { createHash, randomBytes } from "node:crypto";

/**
 * The one way this application mints a link that stands in for a login.
 *
 * Referee links (0013) and school invites (0016) share the same discipline,
 * so they share this: 32 bytes of CSPRNG, and only the digest ever reaches
 * the database — `token_sha256` will not accept anything that is not 64 hex
 * characters, so a plaintext token cannot be stored there by accident.
 *
 * The plaintext exists in exactly two places: the email that is about to be
 * sent, and the URL the recipient clicks. It must never be logged. A full
 * request URL in an access log or an error reporter is a working credential
 * sitting in a system nobody treats as a secret store.
 */

export type MintedToken = {
  /** Goes in the email. Never stored, never logged. */
  token: string;
  /** Goes in the database. */
  sha256: string;
};

export function mintToken(): MintedToken {
  // base64url: URL-safe without escaping, and shorter than hex, so the link
  // survives being pasted into an email client that wraps long lines.
  const token = randomBytes(32).toString("base64url");
  return { token, sha256: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

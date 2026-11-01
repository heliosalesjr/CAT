/**
 * Where to send somebody after they sign in.
 *
 * A page that needs a session bounces to `/signup` and loses the fact that it
 * was asked for at all — you type `/admin`, land on a form headed "Create an
 * account", and nothing says the two events are related. This carries the
 * destination across the magic link so the round trip ends where it started.
 *
 * `safeNext` is the security half, and it is why the value never goes
 * anywhere near a redirect untested. It arrives in a query string, which
 * means an attacker writes it: a link to our own signup page carrying
 * `?next=https://evil.example` would have us hand the person off after they
 * authenticate, with our domain in the address bar for the whole first half.
 * Only a path on this origin is allowed through, and everything else — an
 * absolute URL, `//evil.example`, a `mailto:`, a backslash some parsers read
 * as a slash — comes back null and the caller falls back to its own default.
 */

export function safeNext(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0 || value.length > 512) return null;
  // Must be a path on this origin: one leading slash, and nothing that a
  // browser or a URL parser could read as the start of an authority.
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//")) return null;
  if (value.includes("\\") || value.includes("\0")) return null;
  // Control characters, which some parsers strip before resolving.
  if (/[\x00-\x1f\x7f]/.test(value)) return null;
  return value;
}

/** The sign-in page, remembering where the person was trying to go. */
export function signInPath(next: string): string {
  const safe = safeNext(next);
  return safe ? `/signup?next=${encodeURIComponent(safe)}` : "/signup";
}

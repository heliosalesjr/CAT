import NextAuth from "next-auth";
import type { EmailConfig } from "next-auth/providers";
import PostgresAdapter from "@auth/pg-adapter";
import { claimPlatformSeat } from "./lib/db/actors.ts";
import { pool } from "./lib/db/client.ts";
import { sendEmail } from "./lib/email/index.ts";
import { magicLinkEmail } from "./lib/email/messages.ts";

/**
 * Auth.js, magic link only.
 *
 * Decision 7: both sides start on a link by email, and LinkedIn arrives for
 * candidates later. Later is a second entry in `providers` and nothing else —
 * the adapter tables in 0015 are the same whichever providers are enabled,
 * which is why they went in before any of this was written.
 *
 * No nodemailer and no SMTP: `EmailConfig` only insists on
 * `sendVerificationRequest`, so the provider hands the link to this project's
 * own sender and the choice of transport stays in one file.
 */

const magicLink: EmailConfig = {
  id: "magic-link",
  type: "email",
  name: "Email",

  // Short, because this is a credential sitting in an inbox. Long enough that
  // somebody can finish reading an email before it dies.
  maxAge: 15 * 60,

  /**
   * Auth.js looks the user up by exact email, while this schema's unique
   * indexes are on `lower(email)`. Without normalising, Alice@school.edu and
   * alice@school.edu would be one row to Postgres and two to Auth.js: the
   * second sign-in would try to insert a duplicate and fail on an index,
   * which is a confusing way to learn about capital letters.
   *
   * The comma is Auth.js's own guidance — an identifier with a comma in it
   * can become a second recipient further down a mail pipeline.
   */
  normalizeIdentifier(identifier) {
    const [local, domain] = identifier.toLowerCase().trim().split("@");
    return `${local}@${domain.split(",")[0]}`;
  },

  async sendVerificationRequest({ identifier, url, expires }) {
    await sendEmail(magicLinkEmail({ to: identifier, url, expires }));
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PostgresAdapter(pool),

  // Sessions live in the `sessions` table from 0015, not in a JWT. A signed
  // token would keep working after an account is deleted or a school user is
  // un-verified, and this product's whole permission story assumes the
  // database is asked. Signing out has to mean something.
  session: { strategy: "database" },

  // Self-hosted on Cloud Run, which terminates TLS in front of the container,
  // so Auth.js has to be told the forwarded host is the real one.
  trustHost: true,

  providers: [magicLink],

  /**
   * The staff claim goes in an EVENT, not in the `signIn` callback.
   *
   * The callback runs before the adapter has created the `users` row — the
   * first attempt at this bound a seat to an id that did not exist yet and
   * died on the foreign key. The event runs after, and Auth.js awaits it, so
   * by the time the browser is redirected the seat is bound and the first
   * page render resolves the actor correctly.
   *
   * It is idempotent: `claim_platform_seat` only touches a row whose
   * `auth_user_id` is still null. And a failure must never lock anybody out,
   * so it is logged and swallowed — the worst case is a founder who resolves
   * to no actor and signs in again.
   */
  events: {
    async signIn({ user }) {
      if (!user?.id || !user.email) return;
      try {
        await claimPlatformSeat(user.id, user.email);
      } catch (err) {
        console.error("could not claim a platform seat:", err);
      }
    },
  },

  callbacks: {
    /**
     * Without this the session has an email and no id.
     *
     * `Session["user"].id` is typed `id?: string`, so TypeScript is perfectly
     * happy reading a field the default session never sets — the compiler
     * cannot tell "optional because some providers omit it" from "optional
     * because it is missing". Everything downstream keys off this id:
     * `actor_for_identity` is looked up by it, and without it every signed-in
     * person looks like a stranger.
     */
    session({ session, user }) {
      // Built field by field rather than spread. With the database strategy
      // the object handed in IS the adapter's session row, `sessionToken` and
      // all, and whatever this returns is what `/api/auth/session` serves to
      // the browser. Returning it whole publishes the session token through a
      // fetch — which is precisely what the httpOnly cookie exists to prevent.
      return {
        expires: session.expires,
        user: {
          id: user.id,
          name: user.name ?? null,
          email: user.email ?? null,
          image: user.image ?? null,
        },
      };
    },
  },

  // No `pages` override yet: the built-in sign-in page works and the custom
  // one belongs with the signup forms. Adding it here before it exists would
  // point the flow at a 404.
});

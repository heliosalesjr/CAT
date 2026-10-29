# Class Act Talent — web

Next.js (App Router, self-hosted), Postgres, Auth.js.

**`STATUS.md` says where the project is** — what is real, what is still a
mockup, and what is not built. Start there. Then `CLAUDE.md` for the stack and
the business rules, `db/README.md` for the schema and the data layer, and
`db/DECISIONS.md` for the thirteen decisions that shaped both.

## Running it locally

```bash
# web1/.env.local — gitignored
DATABASE_URL='postgres://...-pooler.../neondb?sslmode=verify-full'
AUTH_SECRET='<openssl rand -base64 32>'

# Schema and sample data, using Neon's DIRECT host (no "-pooler"): the pooled
# endpoint is PgBouncer in transaction mode — right for the app, awkward for DDL.
DATABASE_URL='<direct>' npm run db:migrate
DATABASE_URL='<direct>' npm run db:seed

npm run admin add you@example.com "Your Name" owner   # the staff allowlist
npm run dev
```

Lost? `npm run db:doctor` says where that database stands and what to run
next. It reads and counts; it never writes.

## Signing in as platform staff

There is no signup for the admin side and there should never be one. A row in
`platform_users` is created from the command line by somebody holding the
database URL (`npm run admin`), and signing in with that address binds the
seat to the identity — `claim_platform_seat` in `0019`, called from the
`events.signIn` hook. (Not the `signIn` callback: that runs before the adapter
has created the `users` row, and binding there dies on a foreign key.)

Decision 9 covers three tables now, so one address is one actor. Testing all
three sides means three addresses; `you+school@`, `you+teacher@` land in the
same inbox and count as different people.

| | |
| --- | --- |
| `DATABASE_URL` | Required. Use Neon's **pooled** host; the app keeps a small pool per Cloud Run instance. |
| `AUTH_SECRET` | Required. Signs the session cookie. Any 32 random bytes; generate a different one per environment. |
| `EMAIL_TRANSPORT` | Optional, defaults to `console`. See below. |

## Signing in, before email is configured

There is no email sender yet, and none is needed to develop. `EMAIL_TRANSPORT`
defaults to `console`: every message is printed to the terminal instead of
being sent, magic link included. Type an address into the sign-in form, read
the link out of the terminal, paste it into the browser.

In production this refuses to start rather than printing credentials to a log.
Configuring a real transport is a second file in `src/lib/email/` and one
environment variable — nothing else in the application changes.

What a real transport needs is a **domain**, not an address: SPF, DKIM and
DMARC are DNS records on the sending domain, so a personal or disposable
address cannot authenticate and will be filed as forgery. The referee link is
the one that punishes a weak setup — it goes to a stranger at a school with
corporate filtering, and when it fails nobody finds out, because the referee
simply never replies.

## Sign-in, as built

Magic link only, both sides, per decision 7. LinkedIn for candidates is a
second entry in `providers` when it is wanted — the adapter tables went in
before any of this was written precisely so that stays true.

- Sessions live in the `sessions` table, not in a JWT. A signed token keeps
  working after an account is deleted or a school user is un-verified, and
  every permission in this product assumes the database is asked.
- The link is single-use and expires in 15 minutes.
- Addresses are lower-cased before lookup, because the schema's unique indexes
  are on `lower(email)` and Auth.js looks up by exact match.

`currentActor()` in `src/lib/session.ts` is what a page calls. It returns
`null` in two different situations the caller has to tell apart — nobody
signed in, or signed in and signup never finished — so `currentIdentity()`
separates them.

## The profile form

`PROFILE_SECTIONS` in `src/lib/profile-fields.ts` describes every field a
candidate may edit, once. The form renders from it and the save action parses
from it, which is the only thing keeping the two in step — a field added to
the screen and not to the parser would silently fail to save.

Two rules the form does not own. It does not compute the headline
completeness: that comes from `candidate_completeness_breakdown`, the same
rows the ranking reads, so the screen cannot promise what the matching
denies. And it does not know the subject vocabulary: the options come from
`practice_catalog`, which is what stops a profile saying "Maths" while a
posting says "Mathematics". The per-section counts it does compute — those
are a different claim, about how much of one section is answered.

`?view=` still renders the same component against the sample bundle,
read-only, so the product can be shown without an account.

## Two things to know before changing this code

**A view's columns all type as nullable.** Postgres cannot prove otherwise
through a view, so `PracticeOptionsRow.id` is `string | null` over a primary
key. `src/lib/db/candidates.ts` narrows that where it reads a view, once per
read, with the reason written down. Do not teach the generator to guess.

**`db/smoke.ts` runs under Node's type stripping**, which erases types and
emits nothing. Anything in `src/` that it imports has to stay inside that
subset: no constructor parameter properties, no `enum`, no namespaces. The
restriction is worth the trade — it is what lets the checks exercise the same
modules the app bundles, with no build step.

## Checks

```bash
npm run db:check        # what the schema refuses (113 assertions, rolled back)
npm run db:smoke        # the data layer, signup, profiles and postings (110 checks)
npm run db:types:check  # fails if src/lib/db/schema.ts has drifted
npm run db:doctor       # where this database stands, and what to run next
npx tsc --noEmit
```

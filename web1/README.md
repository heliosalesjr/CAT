# Class Act Talent — web

Next.js (App Router, self-hosted), Postgres, Auth.js. See `CLAUDE.md` for the
stack and the business rules, `db/README.md` for the schema and the data
layer, and `db/DECISIONS.md` for the eleven decisions that shaped both.

## Running it locally

```bash
export DATABASE_URL='postgres://...'          # a Neon branch, or a local Postgres
export AUTH_SECRET="$(openssl rand -base64 32)"

npm run db:migrate && npm run db:seed          # once, against a scratch database
npm run dev
```

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

## Checks

```bash
npm run db:check        # what the schema refuses (73 assertions, rolled back)
npm run db:smoke        # the data layer against a live database (39 checks)
npm run db:types:check  # fails if src/lib/db/schema.ts has drifted
npx tsc --noEmit
```

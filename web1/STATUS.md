# Where this is, 2026-11-02

A map, not a tour. `CLAUDE.md` says what the product is, `db/DECISIONS.md` why
the schema is shaped as it is, `db/README.md` how the database and data layer
work, and `README.md` how to run it. This file answers the question those four
do not: **what actually exists right now, and what only looks like it does.**

Read it first in a new session. It is the cheapest way to avoid rebuilding
something that is already there, or trusting a screen that is a mockup.

## In one paragraph

The loop closes. A candidate signs up with a magic link, fills in a profile,
browses live roles and applies; the school sees them in the pipeline and moves
them along or ends it with a reason the candidate reads. A founder verifies
the school that made the role possible, and the school's own dashboard is now
the school's own data, honest empty states included. **What is still missing
is the ranking itself** — an application is born unscored and waits for a job
that does not exist yet — and one of the three original dashboards is still
the sample bundle rather than the signed-in person's data.

## Routes, and what is real

| Route | Reads | State |
| --- | --- | --- |
| `/` | — | Landing page, finished |
| `/signup` | — | Real. Picks a side, takes an address, sends the link |
| `/signup/finish` | database | Real. Candidate or school, three school paths |
| `/signup/done` | database | Real. Shows the person their own completeness |
| `/admin` | database | Real. Staff queues: verify school, confirm user, prove domain |
| `/dashboard/school/postings` | database | Real. The school's own roles |
| `/dashboard/school/postings/[id]` | database | Real. The pipeline for one role, one step at a time |
| `/dashboard/teacher/jobs` | database | Real. Live roles, why you cannot apply, and where your applications stand |
| `/dashboard/school/postings/new` | database | Real. The role form with the ordered criteria picker |
| `/dashboard/teacher/profile` | database **and** bundle | Real when signed in as a candidate; `?view=` renders the bundle read-only for demos |
| `/dashboard/school` | database **and** bundle | Real when signed in as a school user; `?view=` renders the bundle read-only for demos |
| `/dashboard/teacher` | database **and** bundle | Real when signed in as a candidate; `?view=` renders the bundle read-only for demos |
| `/dashboard/shortlists` | **bundle only** | Mockup, and the ranking showcase |
| `/hero-lab` | — | Design scratchpad |

A page that needs a session bounces to `/signup?next=<path>`, the sign-in
page says which page it was and the magic link lands there instead of on the
dashboard. `safeNext()` in `src/lib/next-path.ts` is what makes `next` safe to
redirect to — it allows a path on this origin and nothing else, because the
value arrives in a query string and `redirectTo` is where Auth.js sends
somebody the instant they are authenticated.

Every route under `/signup`, `/dashboard` and `/admin` carries a session bar
from its layout: who you are signed in as, which actor that resolves to, and
Sign out. It renders nothing when nobody is signed in. Testing the three sides
means signing in and out constantly, and the state it exists to make visible
is the one that otherwise looks like success — an identity with no actor
behind it, which is a signup that stopped half way.

`/dashboard/shortlists` is the last mockup, and it is the biggest trap left in
the repo. It is a good mockup — it is what the ranking is supposed to feel
like — and nothing on it is the signed-in person's data.

The other two were the same trap and were fixed the same way. `/dashboard/school`
went first, on 2026-11-01, after a real school signup landed on it and read
Melissa's pipeline as its own. `/dashboard/teacher` went on 2026-11-02, after a
real teacher signup landed on Daniel's — his offer, his passport, his name in
the header. The pattern both now follow is the one to copy for the last one:
no `?view=` means the signed-in person's data, `?view=` means the bundle
read-only, and the demo switch lives only on the demo path.

What the teacher dashboard reads is `src/lib/db/candidate-dashboard.ts`, and it
feeds the same three components the demo uses — `Readiness`, `Blockers`,
`MyApplications` — so the real screen is the designed screen rather than a
plainer copy of it. Two zones have no real equivalent and say so in words
instead of drawing an empty shelf: there are no interviews because nothing
schedules one, and no recommendations because the matching job does not
exist. A candidate with nothing yet — no application, nothing uploaded, nobody
named — gets the first-day screen, which is the state every real account starts
in.

## What the database refuses on its own

The rule of thumb this project follows: **if a check could be wrong in a way
that exposes somebody's documents or changes who can see what, it lives in
SQL.** The application asks; it does not decide. That is why a bug in a page
cannot leak a passport, and why a second code path — an importer, a duplicate
button, a script — inherits every rule for free.

| Rule | Where | Enforced by |
| --- | --- | --- |
| Permissions are a role template plus a per-person delta | `0002` | `school_user_effective_permissions`, `school_user_has()` |
| An unverified school user resolves to **zero** permissions | `0016` | the same view, one extra condition |
| Documents: hold `view_documents`, candidate applied here, reached screening | `0007` | `may_read_document()`, and the log refuses to record a read it would deny |
| Messaging is locked until the application reaches the configured stage | `0006` | `messages_enforce_gate` |
| One identity is exactly one actor, across three tables | `0015`, `0019` | `identity_binds_to_one_actor` |
| Staff seats come from the command line, never a form | `0019` | `claim_platform_seat()`, allowlist in `platform_users` |
| Only active staff verify, confirm or prove | `0020` | `platform_assert_staff()` inside each function |
| A role is live only while its school is verified | `0021` | `job_postings_live_needs_verified_school` |
| A posting's author must hold `post_jobs` there | `0021` | `job_postings_enforce_author` |
| One application per candidate per role | `0005` | a unique index |
| Stages move one step forward, or out | `0005` | `stage_transition_allowed` |
| Only `move_stage`, and only at your own school | `0022` | `move_application_stage()` |
| Ending an application needs a reason the candidate reads | `0022` | the same function |
| A work permit blocks, a second passport unblocks | `0022` | `posting_excludes_candidate()` |
| An unconfirmed school user sees no pipeline | `0016`, page | zero permissions resolved in SQL; the page tests the set, not `verified_at` |
| Subjects and specialisms come from one catalog | `0017` | `validate_practice_arrays` |
| Ranking criteria: 3–5, distinct, catalogued | `0004` | `job_postings_validate_criteria` |
| The plan is a ceiling on ranking, never a floor | `0009` | `job_postings_enforce_plan` |
| Access logs are append-only | `0014` | triggers on `document_access_log`, `audit_log` |
| Completeness is computed, never written by the app | `0018` | `candidates_set_completeness` |

Thirty-one triggers in total. `db/check.mjs` asserts the refusals.

## What is checked, and how

```bash
npm run db:check        # 139 assertions about what the schema refuses
npm run db:smoke        # 144 assertions about the TypeScript that talks to it
npm run db:types:check  # fails if src/lib/db/schema.ts has drifted
npx tsc --noEmit        # needs a build first: Next generates PageProps
```

Most of `db:check` is about refusals rather than happy paths. A suite that only
proves things work passes against a schema with every constraint dropped.

The whole set has been run against Neon on PostgreSQL 18.6, not only against
the local 16.2.

## What is not built

Roughly in the order it will hurt:

- **The ranking itself.** Every application is born
  `rankable = false, not_rankable_reason = 'awaiting_ranking'` and nothing
  flips it. The weights, the criteria and the explainability rules are all
  settled; what is missing is the job that scores an application against the
  ten criteria and writes `criterion_scores`, `criterion_notes` and
  `ai_rank_score`. Until it exists every pipeline is in applied order.
- **The last mockup dashboard**, above: `/dashboard/shortlists`.
- **Interviews.** The table exists from 0008 and nothing writes to it, so the
  real teacher dashboard omits the zone the bundle draws rather than render an
  empty one. Scheduling is what is missing, not the schema.
- **Email.** `EMAIL_TRANSPORT=console` prints to the terminal and writes the
  link to `.next/last-email-link` (`npm run signin`). It refuses to start in
  production. A real transport needs a verified domain, not an address.
- **Uploads.** Photo, video and documents all need Cloud Storage. The buttons
  are disabled and the missing points show honestly in completeness.
- **Billing by enrollment.** Settled on 2026-10-27 and not implemented:
  `0009_billing` still measures job postings. Nobody is billed yet.
- **Privacy and terms pages.** The words are in `docs/legal-drafts.md`; the
  pages do not exist.
- **Screening questions** on a posting: the column takes them, the form does
  not offer them.
- **Reference requests from the UI.** `0013` has the whole token flow; nothing
  calls it yet.

## Five defects in the sample bundle, found by running it

`docs/mock-data.json` is the schema contract and is mostly right. These are
the places it is not, each found by executing rather than reading:

1. **Thirty candidates had salary ranges running backwards.** Fixed in the
   bundle on 2026-10-21 with the founder's go-ahead; the pre-flight still
   checks, because the generator was not fixed.
2. **`dependentTuitionCovered` is a count, not a boolean.** `0004` was wrong
   and was corrected.
3. **`notifications.severity` uses four values**, not the three `0010`
   allowed. Corrected.
4. **The candidate counters are decorative.** 129 claim a verified document
   and 5 have one; 103 claim a verified supervisor reference and 5 have one.
   Nothing fails, but any measure built on evidence reads this population as
   having almost none — which is what shaped decision 11.
5. **Two rules the bundle predates**, resolved by the seed with a warning
   each: a posting authored by a coordinator (loaded with no author) and two
   live roles at an unverified school (loaded as `on_hold`).

## Consequences worth remembering

**One address is one actor.** Testing all three sides needs three addresses;
`you+school@`, `you+teacher@` land in the same inbox and count as different
people. A staff address can never be a candidate.

**Completeness no longer produces a "not yet rankable" group.** With decision
11's definition every one of the bundle's 136 candidates passes the threshold,
including `tch_0009`, whom the teacher dashboard's `?view=blocked` demo
presents as exactly that case.
That is the bundle's doing — its candidates all filled everything in — and
keeping the demo honest means regenerating a few sparse profiles.

**Route-scoped stylesheets do not travel, and an undefined class is not an
error.** `dashboard/layout.tsx` imports only `dashboard.css` and
`signup/layout.tsx` only `signup.css`; `globals.css` comes from the root. Six
screens under `/dashboard` had been written against signup.css — **sixteen
classes that matched no rule on their own route**, so the posting form had no
field layout, the pipeline no rows and the job browser no cards. Nothing
catches this: the build passes, the markup is valid, the page is simply naked.
Fixed on 2026-11-01 — `su-note`/`su-error`/`su-btn` swapped for the
dashboard's `.note` and `.btn`, the form's `su-*` field classes ported into
`dashboard.css` (the prefix is still wrong; renaming is a tidy-up for when the
form is next edited), and the two list screens rebuilt on `.cand-row` and
`.job-row`.

The audit that found it is worth re-running after any new dashboard screen:
collect every `className` under `src/app/dashboard` and `src/components/dashboard`
and check each one has a rule in `dashboard.css` or `globals.css`. Ten names
survive it as deliberate hooks — `queue`, `pipe-meta`, `health-primary`,
`cp-available` and similar — because a parent rule does their layout.

**`npm run` is always from `web1/`.** There is no `package.json` at the repo
root.

**Migrations are files, so going live is `db:migrate` against a clean branch.**
Neon branches do not merge schema back. `dev` is where the work happens;
`production` has never been migrated.

# Actors and permissions — decided 2026-10-12

Six questions about *who acts on this platform and what they may do*. A schema
absorbs a new field or a renamed column cheaply; it does not absorb a change to
the cast of actors, because that spreads into every table, screen and
permission check at once. So these were settled before the schema went any
further, against the evidence in `docs/mock-data.json` rather than in the
abstract.

Settled by both founders on the worksheet at
<https://claude.ai/artifact/SvZDf4Gjj24b9omLrpxFva>.

**These are closed.** Reopening one is a migration with live data in it, not a
preference — bring new evidence, not a second opinion.

| | Decision | Chosen | Lives in |
| --- | --- | --- | --- |
| 1 | How are a school user's permissions decided? | Role sets a default, each person can be adjusted | `0002_rbac` |
| 2 | Can one person act for more than one school? | One person, one school | `0002_rbac` |
| 3 | Does a candidate say what kind of post they want? | Yes, and they may want more than one | `0012_candidate_role_families` |
| 4 | Can someone who has never taught have a profile? | Yes — a specialism stands in for subjects | `0012_candidate_role_families` |
| 5 | How does a referee answer? | A one-time link by email, no account | `0013_referee_access` |
| 6 | What can the two founders see? | Everything, and every look is logged | `0014_platform_staff` |

---

## 1 · Permissions are a role template plus a per-person delta

**Evidence.** The bundle's two `principal` users do not hold the same
permissions: `usr_his_head` has `view_salary`, `usr_cai_principal` does not. If
the role decided everything, those two rows would be identical.

`roles` and `role_permissions` carry the template, `school_user_grants` records
the additions and revocations, and `school_user_effective_permissions` /
`school_user_has()` are the only correct way to ask. Never union the two by
hand.

**Not chosen.** *Role decides, full stop* — it would have made the bundle's own
data a defect to clean up, and `manage_users` exists as a permission precisely
because somebody administers these per person. *Each school customises its
roles* — covers policy but not the individual exception that already exists.

## 2 · One person, one school

**Evidence.** Every user in the bundle belongs to exactly one school. School
groups, consultants and a head who changes school are real in the market, but
none of them is in the product yet.

`school_users.school_id` is a plain NOT NULL column. There is no membership
table, and a head who moves gets a new account and loses their history — that
is the accepted cost.

**Not chosen.** *Several schools per person*, and also not *one for now, built
as many* — the deferred membership table was on the table and refused, so when
this does come back it is a real migration. That was the choice.

## 3 · A candidate declares one or more kinds of post

**Evidence.** `role_family` was on `job_postings` from `0004` but nowhere on the
person, so matching compared a counsellor against a teaching profile and had no
idea. Three of the ten postings are not teaching roles.

`candidate_role_families` is a join table: a head of science who would still
take a DP Chemistry post declares both, which is the normal case in
international schools rather than the exception. Ask through `candidate_seeks()`
and `candidate_seeks_posting()`.

A candidate who has declared nothing is **unfiltered, not excluded** — 136
profiles predate the question, and dropping them from every result would look
exactly like a matching bug.

**Not chosen.** *One family per candidate* — it would force a teacher moving
into leadership to pick. *Infer it from history* — wrong for career-changers,
and wrong silently.

## 4 · Someone who never taught can have a profile

**Evidence.** All 136 candidates in the bundle carry subjects, without one
exception — yet fourteen of them are counsellors and learning-support staff
whose "subject" is their practice, and one posting (`job_his_counsel`) already
drops the subject criterion from its ranking.

`specialisms text[]` is on both `candidates` and `job_postings`, same
vocabulary on both sides so a profile and a posting can be compared directly.
`subjects` stays `NOT NULL DEFAULT '{}'` — an empty array already meant "none",
so nothing had to become nullable. A librarian, a nurse or an admissions
officer is now describable.

Nothing in the DDL requires a candidate to be coherent (a `teacher` family with
no subjects, say). Profiles are filled in gradually and rule 6 already treats an
incomplete one as unrankable rather than invalid, so coherence is scored in
`profile_completeness`, never enforced by a constraint that would refuse to
store a half-finished profile.

**Not chosen.** *Teaching-adjacent roles only* — a positioning choice, and the
bundle's own counsellors argue against it. *Not in the first version* — the
column was free to add now.

## 5 · A referee answers through a one-time link

**Evidence.** Twelve referees are in the bundle with a name, an email, a
relationship and a status — and no account, no way in, and no way to answer.
One has been waiting 21 days; another declined.

`reference_access_tokens` stores **only a sha256 digest** of the link, which
expires (14 days), is single-use, and is revoked automatically when a reminder
issues a replacement. `reference_token_issue()`, `reference_token_resolve()`
(opening is not answering) and `reference_answer()` are the whole flow;
`expire_reference_requests()` is the sweep. Phase 1 stores and does not verify,
so a link can record `unverified` or `declined` and **never** `verified` — the
function refuses.

This closes the "reference authenticity" open question in `CLAUDE.md`.

**Not chosen.** *A real account* — almost nobody signs up for one, and the
status would stay `unverified` forever. *The school chases them by hand* —
nothing to build, and nothing ever answered.

## 6 · The founders see everything, and every look is logged

**Evidence.** There was no platform-staff actor in the schema at all, while the
rules say every view of a sensitive document is logged and a document is only
visible to a school the candidate applied to. That logic had no answer for a
founder doing support — and the honest outcome of no answer is someone reading
rows out of the database with no trace.

`platform_users` is the actor; `platform_may_read_document()` is deliberately
broad and deliberately a *separate* function from `may_read_document()`, so no
school code path can widen itself by accident. `document_access_log` takes
either a school user or a platform user, never both, and its verify trigger
checks whichever applies.

The option was chosen on the condition that the log cannot be quietly edited,
so `document_access_log` and `audit_log` refuse UPDATE and DELETE outright. The
single exception is the one UPDATE `0011`'s deletion flow needs: stamping
`subject_anonymised_at`, and clearing the requester's `ip` and `user_agent`
with it. `TRUNCATE` is not a row operation and still works, which is what keeps
`db:reset` usable on a scratch branch.

**Not chosen.** *Same rules as everyone* — cleanest promise to a candidate,
and support becomes guesswork. *Break-glass with a notification to the
candidate* — the strongest position and the most work; revisit it when there is
someone on support who is not a founder.

---

## Still open

Two actors were named on the worksheet and not decided, because nothing is
blocked on them:

- **A candidate's partner.** `candidates.partner_candidate_id` is a plain
  self-reference today. Teaching couples are in the bundle — two apply to the
  same school — and whether a couple is one link or a shared application is
  undecided.
- **Platform staff who are not founders.** `platform_users.role` already
  distinguishes `owner` from `staff`; what `staff` may do differently is not
  yet decided, and decision 6 currently gives them the same reach.

---

# Identity and signup — decided 2026-10-21

Five more, settled the same way and for the same reason: they decide who can
create an account, what that account can reach, and what the product refuses to
store. Everything below is in `0015`–`0018`.

| | Decision | Chosen | Lives in |
| --- | --- | --- | --- |
| 7 | How does somebody log in? | Magic link by email, both sides. LinkedIn for candidates later | `0015_auth_identity` |
| 8 | How does a school user prove they work there? | Work email first, and it picks the school | `0016_school_affiliation` |
| 9 | Can one person be a candidate and a school user? | No — separate account, separate email | `0015_auth_identity` |
| 10 | Free-text subjects, or a controlled list? | A catalog, one vocabulary, `kind` says which column | `0017_practice_catalog` |
| 11 | What does profile completeness measure? | The form. Paperwork is readiness, measured separately | `0018_profile_completeness` |

## 7 · Magic link first, LinkedIn later

LinkedIn-only was the original call, on cost: no per-MAU charge. It survives
for candidates, where the profile prefill is worth real money — a LinkedIn
profile *is* the CV. It does not survive for schools: an HR officer invited by
email may not have LinkedIn, and an invite wants an email link anyway.

So both sides start on a magic link and LinkedIn arrives for candidates later.
The Auth.js adapter tables in `0015` are the same whichever providers are
enabled, so that later is **a provider entry in the config, not a migration**.

Those four tables — `users`, `accounts`, `sessions`, `verification_token` —
belong to `@auth/pg-adapter`, and their quoted camelCase columns break this
schema's own naming rule on purpose: their shape is the library's contract,
and four tables of quoted identifiers is cheaper than maintaining a fork of
the adapter. Nothing in the application should query them directly.

With a magic link, **the email is the identity**, so `candidates` finally has
an email column. It is nullable: the bundle's 136 profiles predate the
question, and the consequence is exact — a candidate without an email cannot
log in. Inventing addresses for them would put fake contact details in the one
table whose purpose is contacting people.

**Cost to accept.** An email sender is now on the critical path for signup, not
just for referee links and notifications. Pick one, put it behind an interface
the way `CLAUDE.md` requires of the AI provider, and get the domain's SPF and
DKIM right: a magic link in a spam folder is a login page that does not work.

## 8 · The work email comes first, and it picks the school

The original proposal was invite-only, administered by hand. The founders'
version is better and is what got built: the signup form asks for the work
email **before** it asks for the school, and the email's domain finds the
school — searchable list, free-text fallback, register-a-new-school path with
phone and address, confirmed by a human at first.

The hole that opens, and the reason this decision has three layers: picking a
school from a list is a *claim*. The `hr` template carries `view_documents`, so
an unchecked claim against a real school reaches the passports and transcripts
of everyone who applied there and got to screening. Gating the *posting* of
jobs — the founders' first instinct — protects the advert, and the advert is
not the dangerous part.

1. **The domain proves it.** `school_email_domains` maps domain to school; a
   magic link proves control of the address; a match against a **verified**
   domain proves the affiliation with nobody in the loop. The same reasoning
   the schema already applies to referees in
   `references_.email_domain_matches_school`. The table is keyed the other way
   round from an array on `schools` because the lookup runs domain → school,
   one school can hold several domains, and one domain can serve several
   campuses of a group — the form shows the short list and the person picks.
2. **Anything else waits for a human**, and after that a verified user invites
   colleagues directly: `school_user_invites`, with the hashed, expiring,
   single-use, revoked-on-reissue discipline copied from the referee link in
   `0013`. Only `manage_users` may invite, checked in the function and not in
   the form.
3. **Pending means nothing.** An unverified school user resolves to zero
   permissions whatever their role says — one extra condition inside
   `school_user_effective_permissions`, which `school_user_has()`,
   `may_read_document()` and the messaging gate all inherit without being
   told. This is the layer that matters: if 1 and 2 are ever bypassed, the
   damage stops at reading job adverts.

`public_email_domains` exists because of layer 1. If `gmail.com` were ever
attached to a school, every Gmail address on earth would verify into it. A
trigger refuses it in the schema rather than in the form, because the form will
not stay the only thing that writes there.

**Not chosen.** Invite-only from the start — it makes every single signup a
support ticket, and the domain check does the same job for free in the common
case.

## 9 · One person, one actor

A school user who wants a job creates a separate candidate account, with a
separate email. Enforced in the database by a trigger on both tables, checking
the identity **and** the email, so the clash surfaces at signup with a sentence
somebody can act on rather than at login with a dead end.

The consequence is worth saying out loud, because it is a feature: a head of
school who is job-hunting uses their work address for the school account and a
personal one for the candidate account. They would have wanted that anyway.

**Not chosen.** Two nullable unique columns on one identity, hidden in the UI.
Cheaper now, and it would have made every "who is this request" answer a
branch instead of a lookup.

## 10 · One vocabulary, catalogued

`subjects` and `specialisms` were free-text arrays, and a free tag input
produces "Maths", "Mathematics" and "Math" inside a week. Matching compares
those arrays literally, so the ranking degrades with no error anywhere.

`practice_catalog` holds both, with `kind` saying which column a row belongs
in, and triggers validate the arrays on write — the same answer `0004` gave for
`ranking_criteria`, which has the same problem. The 26 subjects are every
distinct value in the bundle; the specialisms are the two the bundle hides
inside `subjects` plus the four decision 4 exists to make describable.

It is **not** called `subject_catalog`, because a third of what it holds is not
a subject. That is the same small lie as calling the person a Teacher, which
this schema already paid once to rename.

**Consequence.** `seed.mjs` now moves `Counseling` and `Learning Support` out
of `subjects` and into `specialisms`, on candidates and postings alike, because
the catalog refuses to call counselling a taught subject. Fourteen candidates
and one posting come out with no subject at all — decision 4 working on real
rows rather than on a hypothetical librarian. The bundle file is still
untouched; what changed is the seed's reading of it.

## 11 · Completeness is the form; paperwork is readiness

Rule 6 — nobody below 70% is ranked — rested on a number with no definition.
The bundle carried it pre-computed and the profile form approximated it in the
browser by counting filled fields per section.

Counting fields is the trap: it makes "coaching and activities" weigh the same
as "the subjects you teach", so the list of fields silently decides who gets
ranked. The weights in `0018` are instead justified against
`criteria_catalog.measured_from`, which names the candidate fields each ranking
criterion actually reads, and `reads_into` records the justification per weight
so it can be argued with.

**Two measures, not one.** How much of your profile you have filled in is one
thing; whether your documents and references are in order is another. The
dashboard already separates them — there is a Readiness panel — and `0007`
already gates documents to screening. A fully typed profile from somebody who
has not uploaded a passport is not half empty: a school can read it and decide.
So `profile_completeness` scores the form and `candidate_readiness()` scores
the evidence, separately.

**The threshold is a dial and always was.** `rankable_threshold()` from `0003`
is one function returning one number; moving 70 to 60 is that line, with no
migration, no backfill and no stored comparison anywhere. `db:check` proves it
by replacing the function inside a transaction and watching the rankable set
move. Changing the number itself is a product decision with the co-founder, per
`CLAUDE.md`; making it cheap to change was the engineering job.

**Still open, and it needs the co-founder.** With this definition every one of
the bundle's 136 candidates scores 80–99 and all of them are rankable, so the
"not yet rankable" group that rule 6 describes does not exist in the demo data
— including `tch_0009`, whom the teacher dashboard shows precisely as that
case. That is the bundle's doing, not the formula's: its candidates all have
every profile field filled. Keeping the demo honest means regenerating a
handful of genuinely sparse profiles, not retuning the weights until the
picture looks right.

---

# Posting a role — decided 2026-10-29

Two rules the product had been claiming and not enforcing. Neither was a new
idea: both are written in the drafted terms of service and in the admin copy.
What changed is that `0020` made them reachable. Giving staff separate buttons
for "verify this school" and "confirm this person" created the state they
guard against, so they stopped being true by accident.

| | Decision | Chosen | Lives in |
| --- | --- | --- | --- |
| 12 | May a school that is not verified show roles to candidates? | No. It may draft them | `0021_posting_a_role` |
| 13 | May a posting record an author who could not have posted it? | No, and no author is allowed | `0021_posting_a_role` |

## 12 · A role is live only while its school is verified

**Evidence.** Nothing stopped it. A pending school with a confirmed user —
reachable in two clicks on the admin side built the same day — could publish
to candidates. The drafted terms say "we verify a school as an institution
before its postings go live", and the admin screen said the same thing while
the schema did not.

Drafting stays open: a school waiting on us can write its roles and publish
them the moment it is verified, with no re-entry. And `platform_unverify_school`
now parks live roles as `on_hold` and returns how many, because sending a
school back to pending while its roles stay visible would leave exactly the
state this rule exists to prevent — and the trigger watches postings, not
schools.

**Consequence for the bundle.** `sch_accra` is pending with two live roles.
The seed loads them as `on_hold` and warns. The bundle's explicit intent —
this school is unverified — wins; the posting status is the part the generator
did not model.

**Not chosen.** Blocking the school's users instead. Verification is about the
institution; whether one person works there is decision 8 and a separate
question, and conflating them means a legitimate employee is punished for the
school's paperwork.

## 13 · The author of a posting must hold `post_jobs`

**Evidence.** `job_his_ey` in the bundle was created by `usr_his_coord`, a
coordinator, whose template is `move_stage` and `send_feedback`. The
permission existed and nothing checked it on this path.

NULL is allowed, and that is the interesting half: an importer or a scheduled
job has no human behind it, and recording nobody is more honest than inventing
somebody. What is refused is naming a person who could not have done it. The
seed loads that posting with no author and says so.

**Not chosen.** Granting coordinators `post_jobs`. The three role templates
were settled in decision 1 against the bundle's own data, and widening one to
fit a defect in that same bundle would be backwards.

---

# Applying — decided 2026-10-31

| | Decision | Chosen | Lives in |
| --- | --- | --- | --- |
| 14 | What does a brand-new application carry, when nothing has scored it? | Not rankable, with a reason that distinguishes the two cases | `0022_applying` |
| 15 | Does an excluded nationality block somebody who holds two passports? | No. One usable nationality is enough | `0022_applying` |

## 14 · An application is born unscored, and says which kind of unscored

**Evidence.** `rankable_has_score` from `0005` insists an application carries
either a score or a reason it has none. A new one has neither: the AI has not
run and must not run inside the request, because `CLAUDE.md` puts ranking
behind async jobs and nobody should wait on a model to learn their application
arrived.

Two reasons, not one:

- `profile_incomplete` — rule 6. They are below the threshold, held out of the
  ordering entirely, and **they can fix it**.
- `awaiting_ranking` — we have not scored it yet. They can do nothing, and
  being told so is the difference between patience and anxiety.

Collapsing them would mean telling somebody to fix a profile that is already
finished. The column now has a CHECK listing exactly these two, so a third
spelling cannot appear by accident.

**Consequence.** Until the ranking job exists, every pipeline is in applied
order and every application reads `awaiting_ranking`. That is honest, and it
is visible on both sides rather than hidden behind an empty column.

**Not chosen.** Relaxing the constraint. It is the one thing keeping rule 6
true — that a candidate below the threshold is never scored zero, only held
out — and loosening it to make a form easier would have traded a product
promise for an afternoon.

## 15 · A second passport is enough

**Evidence.** A posting may exclude nationalities for work-permit reasons, and
the bundle's postings carry the column. The naive reading — exclude anybody
who holds an excluded nationality — turns a permit rule into a nationality
bar, and it is wrong on the facts: somebody with Irish and American passports
can be hired on the Irish one.

So a candidate is blocked only when **every** nationality they hold is
excluded. A profile that has not answered yet is not blocked either: treating
silence as a disqualifying answer would punish an unfinished field.

This also settles half of the "nationality exclusions" open question in
`CLAUDE.md`. The other half — reject silently, explain, or block upfront — is
answered by `why_cannot_apply()`, which returns a sentence saying the school
cannot sponsor a permit and that nothing about their profile is at fault. The
candidate reads it **before** applying. The landing page promises zero
silence; a refusal with no reason would be the smallest version of the thing
this platform exists to replace.

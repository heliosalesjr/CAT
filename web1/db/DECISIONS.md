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

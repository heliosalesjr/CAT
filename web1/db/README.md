# Database

Plain SQL migrations, applied by a 75-line runner. No ORM and no migration
framework: CLAUDE.md puts ownership and portability first, and Neon today
becoming Cloud SQL later stays a dump-and-restore only while nothing but
Postgres is needed to read these files.

```bash
export DATABASE_URL='postgres://...'   # Neon connection string

npm run db:migrate:dry    # list what would be applied
npm run db:migrate        # apply pending migrations
npm run db:seed:check     # validate docs/mock-data.json, no database needed
npm run db:seed           # load the bundle (one transaction)
npm run db:reset          # truncate the seeded tables, then load
npm run db:check          # assert the six actor decisions, then roll back
```

`db:reset` refuses to run unless `ALLOW_RESET=1`, so a production URL cannot be
truncated by a stray flag.

## The migrations

| | |
| --- | --- |
| `0001_enums_and_helpers` | the 15 enums, copied from the bundle; `stage_rank`; `set_updated_at` |
| `0002_rbac` | roles, role templates, **per-user grants**, the effective-permission view |
| `0003_candidates` | candidate profiles and the rankable threshold |
| `0004_postings_and_ranking` | criteria catalog, postings, criteria validation, `criterion_weight` |
| `0005_applications` | the pipeline, stage history, transition rules, ranking invariants |
| `0006_messaging_gate` | platform/school settings, messages, **gate enforcement** |
| `0007_documents` | **sensitive document isolation**, the access predicate, the access log |
| `0008_references_interviews` | references and interviews |
| `0009_billing` | plans and subscriptions; the plan as a ranking ceiling |
| `0010_notifications` | notification feed |
| `0011_audit_and_privacy` | audit log, data export and deletion requests |
| `0012_candidate_role_families` | what kind of post a candidate wants; **specialisms**, so a non-teacher is describable |
| `0013_referee_access` | the referee's **one-time link** — hashed, expiring, single-use |
| `0014_platform_staff` | the founders as an actor, and an **append-only** access log |
| `0015_auth_identity` | the Auth.js tables, `candidates.email`, and **one person, one actor** |
| `0016_school_affiliation` | the work email picks the school; **pending means zero permissions**; invites |
| `0017_practice_catalog` | one controlled vocabulary for subjects and specialisms |
| `0018_profile_completeness` | rule 6's number, derived and explainable; readiness kept separate |

`0012`–`0018` implement the eleven decisions recorded in
[`DECISIONS.md`](DECISIONS.md) — six about who acts on the platform, five about
how they get an account. Two of the first six (permissions as a role template
plus a per-person delta, one person per school) were already what `0002` did,
so they add no DDL. Read that file before reopening any of them.

The four tables in `0015` named `users`, `accounts`, `sessions` and
`verification_token` belong to `@auth/pg-adapter`, not to this schema. Their
quoted camelCase columns break the naming rule below on purpose; do not rename
them and do not query them outside Auth.js.

Each file carries its own `BEGIN`/`COMMIT`, so a failure rolls that file back
on its own and leaves `schema_migrations` untouched.

## Three things the schema enforces rather than documents

**RBAC.** Permissions are not a function of the role. The mock has two
`principal` users with different sets — `usr_his_head` holds `view_salary`,
`usr_cai_principal` does not — so `roles` supplies a template and
`school_user_grants` records per-user additions and revocations. Resolve
through `school_user_effective_permissions` or `school_user_has(user, perm)`;
never union the two by hand.

**The messaging gate.** `applications.messaging_unlocked_at` latches open when
the application reaches the configured stage and is never cleared, so a message
stored legitimately at interview stays valid after a later rejection. New sends
are refused by a trigger on `messages`. The stage that opens it comes from
`platform_settings`, overridable per school — `NULL` on the school inherits.
Candidate-to-candidate messaging is not blocked, it is unrepresentable: every
message hangs off an application, and an application has one teacher and one
school.

**Document isolation.** A school user may read a candidate's documents only when
they hold `view_documents`, the candidate has applied to their school, and that
application has reached screening (`docs_unlocked_at`). `may_read_document()`
is the whole rule; `document_access_log` records every signed URL issued, and
refuses to record one the rule would have denied. `storage_key` is constrained
to the `sensitive/` prefix and is never returned to a client.

## Two more things it enforces rather than documents

**A referee's link is a credential.** `reference_access_tokens.token_sha256`
takes nothing but a 64-character hex digest, so the plaintext link cannot be
written there by accident — it exists in the outbound email and nowhere else.
Every token expires, every token is single-use, and `reference_token_issue()`
revokes the live one as it issues a replacement, so "resend" cannot leave two
working links behind. Opening the form is not answering it: that is
`reference_token_resolve()`, which records `first_opened_at` and consumes
nothing. Phase 1 stores and does not verify, so `reference_answer()` refuses to
record `verified` at all.

**The access logs are append-only.** `document_access_log` and `audit_log`
refuse UPDATE and DELETE from a trigger, not by convention. The one permitted
edit is the anonymisation `0011` needs — stamping `subject_anonymised_at` and
clearing `ip` and `user_agent` with it — and the trigger compares the rest of
the row to make sure that is all it does. `TRUNCATE` is a statement, not a row
operation, so `db:reset` still works on a scratch branch. This is the condition
the founders attached to seeing everything: a superuser whose looks are logged
is only worth anything if the log is not editable by that same superuser.

## Naming

The bundle is camelCase; these columns are snake_case. Postgres folds unquoted
identifiers to lower case, so camelCase columns would need double quotes in
every statement forever. The mapping is mechanical (`schoolId` ↔ `school_id`)
and belongs in the TypeScript data layer.

## Derived values

The bundle stores several values that were computed on its generation date:
`daysUntilExpiry`, `daysSinceStageChange`, `daysWaiting`. Those are views here
(`documents_with_expiry`, `references_with_waiting`) because a stored copy is
wrong on every other day. Counters that are expensive to recompute per request
— `application_count`, `documents_verified` — are kept by trigger instead.

## What has actually been run

All eighteen migrations have been applied, in order, to a real PostgreSQL
16.2 — and the bundle loaded into it, all 155 applications and 192 role-family
declarations, with every post-load check passing. `npm run db:check` then
asserts the eleven decisions behave (73 assertions, mostly about what the
database *refuses*), inside a transaction it rolls back.

That run is what turned up the defects below, none of which the parser or the
pre-flight could see. It is not a substitute for a scratch Neon branch: Neon's
own version, extensions and connection limits are untested here, and so is
anything about pooling.

```bash
npm run db:migrate && npm run db:seed && npm run db:check
```

### Four things a live server found

**`dependent_tuition_covered` was a boolean** in `0004` and the bundle carries
`1` or `2` — international schools cover tuition for one or two children, and
`OfferPanel.tsx` already compares the number against `candidates.dependents` to
say "you have 2; 1 is covered". Every posting was refused on insert. Now an
`int`. `0004` was edited in place rather than patched by a later migration,
because nothing had been applied anywhere: this is the cheap afternoon the
`Teacher` → `Candidate` rename was also caught in.

**`notifications.severity` allowed three values** and the bundle uses four — it
has no severity enum to copy from, and `success` ("moved you to Offer") was
missed. A notification feed that cannot carry good news is the wrong shape for
this product. Fixed in `0010`.

**Thirty of the 136 candidates expected a salary range that ran backwards**
(`min > max` — `tch_0018` wanted 60000–50000). The CHECK in `0003` is right and
the bundle was wrong: the generator drew two numbers from one pool instead of
an ordered pair. The thirty pairs were swapped in `docs/mock-data.json` on
2026-10-21 with the founders' go-ahead, and the pre-flight now lists and
refuses any that come back — the fix belongs in the generator, and this check
is what will say if it was not made.

**The candidate counters are decorative.** 129 candidates *claim* a verified
document and 5 have a row in `documents`; 103 claim a verified supervisor
reference and 5 have one. The counters in the bundle were written as numbers
with nothing behind them, and the triggers in `0007` and `0008` compute the
truth from the rows instead. Nothing fails — but any measure built on evidence
reads the bundle as a population with almost none, which is what shaped
decision 11. Regenerating documents and references to match the counters is a
data task nobody has done yet.

## Teacher, Candidate

The entity is `candidates`. A third of the postings in the bundle are
leadership or student-support roles — a coordinator, a head of science, a
counsellor — and the people applying to them do not all teach. `teacher` is
still a value of `role_family`, where it means a classroom teaching post; it
is no longer the name of the person.

The bundle also predates decisions 3 and 4, so it carries neither a declared
role family nor a specialism. `db/seed.mjs` derives both from what it does
carry — a subject outside `{Counseling, Learning Support}` means teaching,
`leadershipYears > 0` means leadership, and those two subjects are a specialism
— which produces 192 declarations for 136 candidates, 56 of whom want more than
one kind of post. The two values stay a *reading* of the bundle: the day the
profile form asks the question outright, the derivation is deleted rather than
migrated. Since `0017` those two values also move OUT of `subjects` and into
`specialisms`, on candidates and postings alike, because the catalog refuses to
call counselling a taught subject: fourteen candidates and one posting end up
with no subject at all, which is decision 4 working on real rows.

`docs/mock-data.json` has not been changed and still uses `teachers` and
`teacherId`. `db/seed.mjs` is the only place the two vocabularies meet: it
reads the bundle's names and writes the schema's, and maps the few string
values that name the type (`"teacher"` to `"candidate"` on a notification
recipient, a subscription owner, an audit subject).

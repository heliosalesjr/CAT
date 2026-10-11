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
```

`db:reset` refuses to run unless `ALLOW_RESET=1`, so a production URL cannot be
truncated by a stray flag.

## The migrations

| | |
| --- | --- |
| `0001_enums_and_helpers` | the 15 enums, copied from the bundle; `stage_rank`; `set_updated_at` |
| `0002_rbac` | roles, role templates, **per-user grants**, the effective-permission view |
| `0003_teachers` | teacher profiles and the rankable threshold |
| `0004_postings_and_ranking` | criteria catalog, postings, criteria validation, `criterion_weight` |
| `0005_applications` | the pipeline, stage history, transition rules, ranking invariants |
| `0006_messaging_gate` | platform/school settings, messages, **gate enforcement** |
| `0007_documents` | **sensitive document isolation**, the access predicate, the access log |
| `0008_references_interviews` | references and interviews |
| `0009_billing` | plans and subscriptions; the plan as a ranking ceiling |
| `0010_notifications` | notification feed |
| `0011_audit_and_privacy` | audit log, data export and deletion requests |

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
Teacher-to-teacher messaging is not blocked, it is unrepresentable: every
message hangs off an application, and an application has one teacher and one
school.

**Document isolation.** A school user may read a teacher's documents only when
they hold `view_documents`, the teacher has applied to their school, and that
application has reached screening (`docs_unlocked_at`). `may_read_document()`
is the whole rule; `document_access_log` records every signed URL issued, and
refuses to record one the rule would have denied. `storage_key` is constrained
to the `sensitive/` prefix and is never returned to a client.

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

## Not verified against a live server

These migrations parse cleanly under the real Postgres parser, plpgsql function
bodies included, and the seed's pre-flight passes against the bundle. Nothing
has been executed: there is no Postgres or Docker on this machine. Run
`npm run db:migrate` against a scratch Neon branch before trusting it.

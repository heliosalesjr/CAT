@AGENTS.md

# Class Act Talent

Two-sided recruiting platform connecting international schools with teachers (largely but not
exclusively American) for placements worldwide — Seoul, Bogotá, Accra and similar markets.

Technical founder works with a non-technical co-founder who owns commercial and relationships
and supplies the domain knowledge. Requirements below come from her, not from guesswork.

Rebuilt from scratch after a non-functional Base44 prototype. **Ownership and portability are
core values** — avoid vendor lock-in wherever a standard, portable alternative exists.
**Pre-investment: fixed monthly cost stays as close to zero as possible.** Prefer free tiers
with scale-to-zero, and prefer free options built on standard technology so upgrading later is
a migration, not a rewrite.

## Stack — decided, do not re-litigate

| Layer | Choice | Note |
|---|---|---|
| Language | TypeScript | front and back |
| Framework | Next.js (App Router), **self-hosted** | `output: 'standalone'`. **Not** deploying to Vercel |
| Database | Neon (serverless Postgres), free tier | standard Postgres; Cloud SQL later is a dump/restore |
| Hosting | Google Cloud Run, source-based deploys | scale-to-zero, no hand-written Dockerfile. Region `us-central1` |
| File storage | Google Cloud Storage | sensitive docs in a **dedicated bucket**, signed URLs only |
| Auth | NextAuth.js (Auth.js) | LinkedIn provider only. No per-MAU cost |
| Payments | Stripe | quantity/tier billing — plans are priced by job-posting count |
| AI | Claude API | behind internal service interfaces so the provider is swappable |
| Async jobs | Cloud Tasks / Pub-Sub | notifications explicitly do **not** need to be real-time |
| Calendar | Google Calendar API | Outlook deferred |

**Firebase/Firestore was considered and rejected**: the schema is strongly relational and
recruiters filter candidates on multiple combined criteria, which Firestore handles badly; and
it is proprietary, contradicting the ownership argument driving this rebuild. Individual
Firebase services may be used in isolation; its data model will not.

## Non-negotiables — never defer these

Compliance-adjacent and expensive to retrofit:

- **RBAC / permissions** in the schema from the first migration, not bolted on
- **Sensitive document isolation** — separate bucket, restricted IAM, time-limited signed URLs
- **Data export and account/data deletion** as first-class features for every user from day one
- **Audit logging** of who viewed whose sensitive documents

## Business rules — enforce at the data/permissions layer, never only in the UI

1. **Teacher → School messaging is locked until the application reaches the interview stage.**
   Before that a teacher may only send a lightweight "super-like" interest signal. Whether
   schools may message earlier is still undecided — build the gate configurable.
2. **Teacher-to-teacher messaging does not exist.** Not hidden — not built.
3. **Shortlists are invisible to candidates.**
4. **Schools do not rate teachers.** Ratings flow one way only (teacher rates school/recruiter).
5. **Application stage transitions are mandatory** — the pipeline is the source of truth.
6. **Candidates below 70% profile completeness are not ranked at all** — `aiRankScore` is null
   and they appear in a separate "not yet rankable" group. They are never scored 0, never
   silently dropped.
7. **AI ranks; a human decides.** Ranking changes ORDER only. It never rejects, filters out, or
   hides a candidate.

## Ranking criteria (the differentiating feature)

Each job posting carries `rankingCriteria`: an **ordered** list of 3–5 criterion ids chosen
from a catalog of 10. Position 1 is the highest priority.

Weight by position: `w(i) = (N - i + 1) / (N * (N + 1) / 2)`.
With 5 criteria → 33 / 27 / 20 / 13 / 7. With 3 → 50 / 33 / 17.

`aiRankScore = round( Σ w(i) × criterionScores[criterionId] )`, scores 0–100.

Every application stores a score **and** a one-sentence note for **all 10 catalog criteria**,
not just the ones currently in use — so the recruiter can both reorder and swap criteria and
the list recomputes entirely client-side.

**Explainability is mandatory and derived, never stored prose.** Show the note for the two
highest-weighted criteria: score ≥ 70 reads as a reason, < 55 as a concern. The reasons must
change when the recruiter reorders.

Schools must be able to turn ranking off entirely and view candidates unordered.

## Core entities

`School` (has many `User` with roles hr / principal / coordinator, each belonging to exactly
one school) · `Candidate` — **not** `Teacher`: a third of the postings are leadership or
student-support roles and not everyone who applies teaches. `teacher` survives as a value of
`role_family`, where it means a classroom post. A candidate declares one or more role families
and may carry a `specialism` instead of subjects ·
`JobPosting` (belongs to School, tied to a Plan tier, carries `rankingCriteria`) ·
`Application` (Candidate + JobPosting; mandatory stages applied → screening → interview →
offer → hired/rejected/withdrawn; carries `criterionScores` and `criterionNotes`) ·
`Document` (diploma / teaching_certificate / passport / transcript / background_check /
reference_letter) · `Reference` (with verification status) · `Interview` (linked to a Google
Calendar event) · `Message` (governed by rule 1) · `Plan` / `Subscription` (Stripe) ·
`Notification`

Two actors have no account and still change things: a `Referee` reaches the product through a
one-time link, and `PlatformUser` (the two founders) can read anything with every look logged.
Who may do what is settled in `db/DECISIONS.md` — six decisions, closed on 2026-10-12, in the
same spirit as the stack table above: do not re-litigate.

## Phase scope

**Phase 1 (now):** profiles both sides · job postings with ranking criteria · applications with
ATS pipeline · candidate search and multi-criteria filtering · Google Calendar interview
scheduling · manual document upload · references (stored unverified) · Stripe billing ·
async notifications · AI job-match alerts and candidate ranking with explainability.

**Phase 2:** background-check provider integration · automated reference authenticity
verification · AI interview prep · AI-generated interview questions · side-by-side candidate
comparison · message moderation.

**Phase 3:** full teacher reviews of schools · AI interview summaries from recordings ·
infrastructure upgrades funded by revenue.

**Explicitly NOT in Phase 1:** background-check integration (store a **manual status flag**
only) · automated reference verification (status stays `unverified`) · full reviews (ranking
only) · persistent conversation history · Outlook sync · multi-region infra.

Design the schema so these slot in without migration pain: nullable `aiRankScore`,
`verificationStatus` on references, `backgroundCheckStatus` on documents.

## Reference material in this repo

- `docs/mock-data.json` — 136 teachers, 155 applications, 10 postings, shaped to this schema.
  Validated for referential integrity, enum conformance and the business rules above. Use it as
  seed data; do not invent fixtures.
- `docs/ranking-demo.json` — focused slice for the ranking feature with four precomputed
  scenarios to verify the weighting maths against.
- `docs/dashboard-prompt-guide.md` — information hierarchy and design intent for both
  dashboards and the posting editor.

## Working agreements

- Match the mock data's field names exactly — it is the de-facto schema contract.
- Any change to a business rule above gets flagged, not silently implemented.
- Flag anything in the requirements that conflicts or looks like a mistake rather than building
  around it.
- Ask when the spec is thin. Three questions up front beat a refactor later.

## Open questions — decide before building past them

- **Nationality exclusions.** Postings can exclude nationalities for work-permit reasons.
  Reject silently, tell the candidate the reason, or block the application upfront with the
  restriction stated on the posting? Product and values decision, not technical.
- **Who may change ranking criteria, and when.** Currently `edit_ranking_criteria` sits with HR
  and principals, not coordinators. Changing criteria after people have applied is allowed and
  audited via `previousRankingCriteria` — but if candidates can ever see their own rank, that
  becomes a disclosure obligation.
- **Background-check partner** — Checkr, Sterling, or a country-specific provider for South
  Korea / Colombia / Ghana. Needed before Phase 2.
*(**Reference authenticity** was here. Decided 2026-10-12: a one-time link the referee
actions, no account — hashed, expiring, single-use. See `db/DECISIONS.md` §5. Phase 1 still
stores the answer `unverified`; the link proves the referee got the email, not who they are.)*
# Class Act Talent — Dashboard & Prompt Guide

How to get good screens out of Claude, plus paste-ready prompts for the school dashboard,
the teacher dashboard, and the job-posting editor with reorderable ranking criteria.

**Files to attach:**
- `mock-data.json` — the full bundle (136 teachers, 155 applications, 10 postings)
- `ranking-demo.json` — a focused slice for the ranking feature only. Attach this one
  instead of the full bundle when you're working on the criteria panel.
- your design system

---

## What the competitor screenshots tell us

Worth reading before prompting, because the gap *is* the product.

**Worth stealing (domain vocabulary users already know):**
- `Likelihood: Definite / Probable / Possible` — schools genuinely don't know yet whether a
  vacancy will exist. Pretending every posting is certain is a lie the UI shouldn't tell.
- `Academic Year`, `Contract Length`, `# Openings Available`, `Apply By` vs `Start Date` —
  four dates and counts recruiters think in. One posting can have 2 openings.
- `Exclude Country` — blunt, but it reflects real work-permit constraints.
- `No. of Dependents` — determines whether a package is viable for a family of five.
- Status taxonomy `Draft / Posted / On Hold / Closed / Archived`.

**What to avoid — these screenshots are a catalogue of what not to do:**
- The APLi summary report renders **every metric as 0**: "Shortest: -, Average: -, Longest: -".
  A skeleton of empty tables is worse than one honest sentence.
- A donut chart reading `Archived (99), Closed (3), Posted (0)` — a chart whose largest slice
  is archived noise. Charts should answer a question, not inventory the database.
- A **wall of instructional prose** at the top of the vacancies page. If your product needs a
  paragraph of explanation, redesign the behaviour.
- A role dropdown with ~50 `ADMIN ...` entries in an unscrollable list.
- "Recently Viewed Applications" as a primary panel — an artifact of a system that can't tell
  you what matters, so it tells you what you last clicked.

The through-line: **these products show you data. Yours should show you decisions.**

---

## The method (any dashboard, any screen)

Six things in every prompt. Skip one and you get generic output.

1. **Who is looking, and what question are they answering in 5 seconds.**
2. **Point at the design system.** Say *use these tokens, don't invent colors*.
3. **Point at the data.** Attach the JSON. Say "use these exact records — invent nothing."
4. **Give the information hierarchy yourself**, as numbered zones.
5. **Name the states**: empty, loading, error, plus the specific edge cases and which record
   IDs demonstrate them.
6. **Say what it must NOT be.** Highest-leverage line in the prompt.

Then iterate in small passes — structure, then density, then motion, then empty states. One
concern per message. Asking for everything at once gets an average of everything.

---

## One metric pairing worth building in

The mock data surfaces something real. Hangang's **median response time is 3 days** — which
looks excellent — but **52 of its 97 applicants have never received any response at all.**
The median only counts people who got answered.

That pairing is the whole argument for your product, so put both numbers next to each other.
A school that sees "median 3 days / 52 never answered" understands the problem instantly.
A school that sees only the median thinks it's doing fine.

---

## Prompt 1 — School / Recruiter dashboard

```
Design the main dashboard for the SCHOOL / RECRUITER side of Class Act Talent,
a hiring platform connecting international schools with teachers worldwide.

VIEWER
Melissa Szarowicz, Director of HR at Hangang International School (Seoul),
opening this on a Monday morning mid-recruiting-cycle. In five seconds she
needs to answer: "which vacancies are in trouble, and who is waiting on me?"
She is not browsing. She is triaging.

DATA
Use the attached mock-data.json. Use these exact records — real names, real
numbers, real dates. Invent nothing. Viewer is schoolUsers.usr_his_hr; her
school is sch_hangang; her figures are in schoolDashboardSummary[0].

DESIGN SYSTEM
Use the attached design system for all color, type, spacing and radius tokens.
Introduce no colors outside it.

INFORMATION HIERARCHY — top to bottom

1. HIRING HEALTH BAR — largest visual weight on screen:
   - Open postings (4)
   - Candidates awaiting your response (22) ← the emotional center. This is
     the product's differentiator. Longest wait is 45 days.
   - Median response time (3 days) paired directly with "never responded"
     (52 of 97). Show these two together: the median looks healthy only
     because it excludes everyone who was ignored. That contrast is the point.
   - Interviews in the next 7 days (4)

2. NEEDS YOUR ATTENTION — a prioritized action queue, not a notification feed.
   Each row: who/what, how long it has waited, one primary action. Sort by
   cost of inaction, not recency. Sources:
   - applications where schoolOwesResponse is true (22 of them — design for
     a queue that long, with sensible truncation)
   - interview int_0005: completed 11 days ago, structured feedback never
     submitted
   - job_his_dt: posted 9 days ago, 63 views, 0 applications

3. PIPELINE BY POSTING — one row per open posting with stage counts. Make the
   posting in trouble visually distinct from healthy ones. job_his_mathco has
   47 applications — that is its own kind of problem, not a success.

4. AI-RANKED SHORTLIST for the most urgent posting. Show the score AND the
   explanation. Each application has criterionScores and criterionNotes; derive
   the visible reasons from the two highest-weighted criteria of that posting's
   rankingCriteria (>=70 reads as a reason, <55 as a concern). Explanations are
   derived, never stored prose. Include a visible control to turn ranking off.
   Five of the 47 candidates are not rankable (profileCompleteness < 70) — put
   them in a separate "Not yet rankable" group rather than scoring them 0.
   State plainly that AI ranks and a human decides.

5. UPCOMING INTERVIEWS — show school-local AND candidate-local time on every
   row. int_0002 is a Doha candidate interviewing with Seoul; the gap must be
   legible at a glance, not computed by the user.

6. ANALYTICS — smallest zone. Applications per week, funnel, time-to-hire.
   Present, not prominent.

STATES TO DESIGN
- Normal (above).
- Empty: a brand-new school, zero postings, zero candidates. My co-founder
  demos this to prospects, so it must look intentional and inviting. Never
  render an empty chart skeleton.
- Permission-reduced: the same dashboard as usr_his_coord, an MYP Coordinator
  whose permissions lack view_salary, view_documents and edit_ranking_criteria.
  Zones should disappear, not appear greyed out behind a lock icon.

MUST NOT BE
- Not a wall of equally-weighted metric cards.
- No donut chart of posting statuses. No pie charts anywhere.
- No panel listing what the user recently viewed.
- No instructional paragraph explaining how the system behaves.
- No confetti, points, badges, streaks or leaderboards. These are staffing
  decisions affecting people's livelihoods. Energy comes from typography,
  spacing and sharp color-coded urgency, not arcade mechanics.

Responsive to tablet. Dark mode if the design system defines it.
```

---

## Prompt 2 — Teacher dashboard

```
Design the main dashboard for the TEACHER side of Class Act Talent.

VIEWER
Daniel Francis, a DP Chemistry teacher with 9 years of experience, currently
in Doha, applying abroad for the 2027-2028 academic year, mid-process with an
open offer. In five seconds he needs to answer: "where do I stand, and what is
blocking me?" He is anxious, checks often, and is deciding whether to move his
family across the world. Respect that.

DATA
Use the attached mock-data.json. Exact records only. Viewer is
teachers.tch_0001; his figures are in teacherDashboardSummary[0].

DESIGN SYSTEM
Use the attached design system for all tokens. No new colors.

INFORMATION HIERARCHY

1. READINESS — the one gamified element, and it must be purposeful rather than
   decorative. A progress ring split three ways: profile, documents, references.
   Incomplete profiles are what actually block matching — candidates below 70%
   are excluded from ranking entirely — so this earns its prominence. It should
   read as a pre-flight checklist, not a game score.

2. ACTIVE APPLICATIONS — the heart of the page. One card per application: the
   school, the role, current stage on a visible funnel, days since the last
   change, and whether the school owes a response. Daniel has an open OFFER —
   unmistakable the instant the page loads.

3. WHAT'S BLOCKING YOU — his blockers array, each with one clear action:
   - CRITICAL: passport expires in 42 days (doc_0003) while he holds an open
     offer. Most work permits need 6+ months validity. Say why, not just what.
   - INFO: background check not started (doc_0006)

4. UPCOMING INTERVIEWS — int_0002, final round with the Head of School in 4
   days. HIS local time first and large, the school's time second. Getting a
   timezone wrong loses someone a job; this component carries real weight.

5. RECOMMENDED ROLES — each must show why it was recommended (whyShown).
   Never an unexplained match score.

6. SAVED ROLES — compact.

STATES TO DESIGN
- Normal (above).
- Blocked: the same dashboard for tch_0009, Rebecca Toledo — profile 45%,
  passport scan rejected, reference from a peer rather than a supervisor, four
  documents missing, zero recommended jobs, not eligible for ranking. The
  page's whole job is to guide her out of this state without shaming her. The
  empty recommendations panel must explain the cause and give the next step.
- First-day empty: brand-new account, zero applications.

MUST NOT BE
- Not celebratory. No confetti, badges, levels, streaks or leaderboards. A
  teacher relocating a family of four is not playing a game. Progress rings and
  milestone markers are welcome; arcade rewards are not.
- No unexplained scores or rankings.
- Rejections handled with dignity — not a red X.
- No dense table as the primary view. This is a personal page, not a console.

Responsive to mobile — teachers check status on their phones. Dark mode if the
design system defines it.
```

---

## Prompt 3 — Job posting editor with reorderable ranking criteria

This is the differentiating screen. Attach `ranking-demo.json` rather than the full bundle.

```
Design the JOB POSTING EDITOR for Class Act Talent, with its ranking-priorities
panel. This is the feature that separates us from every competitor: the school
tells the platform what it values, and the candidate list reorders to match.

VIEWER
David Okonkwo, Head of School at Hangang International School, editing the MYP
Mathematics Coordinator posting. He has 47 applicants and a strong instinct
that the platform is ranking them wrong — it is favouring long classroom
service when what this role needs is someone who has actually led a team.

DATA
Use the attached ranking-demo.json. It contains the posting, its 47
applications, the 10-criterion catalog, the weighting model, and four
precomputed scenarios you can check your maths against. Invent nothing.

DESIGN SYSTEM
Use the attached design system for all tokens.

THE SCREEN — two columns that stay visible together

LEFT: the posting form. Standard fields, grouped and collapsible:
  Basics (title, role family, subjects, division, grade levels, academic year)
  Timing (apply-by date, start date, contract length, openings available,
          likelihood: definite / probable / possible)
  Requirements (curriculum required, minimum years, excluded nationalities,
                cover letter required, screening questions)
  Package (salary band, housing, dependent tuition covered)
  → This half should be competent and quiet. It is not where the product wins.

RIGHT, AND THIS IS THE CENTREPIECE: "What matters most for this role"
  - A drag-to-reorder list of 3 to 5 criteria, currently:
      1. Leadership experience
      2. Curriculum experience
      3. Years of experience
      4. Advanced degree
      5. Availability
  - Each row shows its computed weight as a percentage. With 5 criteria the
    weights are 33 / 27 / 20 / 13 / 7 (formula in rankingModel). The weights
    must visibly recalculate as the user drags.
  - The user can REMOVE a criterion (minimum 3) and ADD one from the catalog
    of 10 (maximum 5). Removing redistributes the weights — with 3 criteria
    they become 50 / 33 / 17. Make that redistribution legible, because it is
    the thing a recruiter will not expect.
  - Every application already carries a score for ALL 10 criteria, so every
    reorder and every swap recomputes entirely client-side. Nothing waits on
    a server.

BELOW OR BESIDE IT: the live candidate list, reordering as the criteria move.
  - This is the payoff. The reorder must be ANIMATED — candidates visibly
    moving up and down is the entire demo. Not a flash, not a reload.
  - Each row: name, score, position, and a movement indicator versus the
    previous ordering (the data has positionDelta).
  - Show each candidate's top two contributing criteria as plain sentences,
    pulled from criterionNotes for whichever criteria currently rank highest.
    These sentences must change when the order changes.
  - Five of the 47 are not rankable (profile below 70%). They sit in a
    separate group below, never scored 0 and never silently dropped.

THE STORY THIS SCREEN MUST TELL
When the Head of School drags "Leadership experience" above "Years of
experience", Marcus Lindqvist — 15 years of DP Physics, only 2 years of
coordination — falls from #1 to #4, and Hanne Lindqvist, with 5 years leading a
department, rises to #1. Regina Rentería jumps four places. Ten of the top ten
change position. Design so that a recruiter watching this understands in one
second that the platform just started working for them. That moment is the
demo, the sales pitch and the product thesis at once.

ALSO DESIGN
- A compact "before / after" comparison the recruiter can open: the previous
  ordering beside the new one. The posting carries previousRankingCriteria and
  rankingCriteriaUpdatedAt for exactly this.
- A confirmation affordance before the new order affects anything candidates
  can see.
- The read-only variant for a user without the edit_ranking_criteria
  permission (usr_his_coord): they see the priorities and the resulting order,
  but cannot drag.

MUST NOT BE
- Not a settings page with sliders and raw numeric weight inputs. Recruiters
  think in priority order, not percentages. The percentage is feedback on
  their ordering, never the input.
- The candidate list must never jump without animation — the motion IS the
  explanation.
- No hidden filtering. Reordering changes the ORDER. It never removes,
  rejects, or hides a candidate, and the UI should make that evident.
- No implication that the ranking decides anything. It orders a list. A human
  hires.

Responsive to tablet. Dark mode if the design system defines it.
```

---

## Iteration prompts

Single-concern follow-ups beat one big rewrite:

- `The attention queue is sorted by recency. Re-sort by cost of inaction: a candidate waiting 45 days outranks an interview tomorrow.`
- `Density is too low — I scroll past whitespace to reach the pipeline. Tighten vertical rhythm so zones 1-3 fit above the fold at 1440x900.`
- `The weight percentages change instantly on drop. Animate them counting to their new value so the redistribution is understood, not just observed.`
- `Design the empty state as its own full screen — it should make a prospect think "I want my school in here", not "this looks broken".`
- `Show the coordinator-permission variant beside the HR variant so I can see exactly which zones disappear.`
- `The AI explanation is in a tooltip. Our requirement is that explainability is always visible. Surface the top reason inline.`
- `Add hover, focus and keyboard-drag states for the criteria list. Reordering must work without a mouse.`

---

## Suggested order of work

1. **Job posting editor + ranking panel** first. It's the differentiator and the hardest
   interaction; getting it right informs the component vocabulary for everything else.
2. **School dashboard** second — it's what your partner demos to paying customers.
3. **Teacher dashboard** third, reusing components the earlier passes established.
4. **Empty states** as dedicated screens — the first thing every real user sees, and what
   gets demoed before you have data.
5. Then hand the same `mock-data.json` to Claude Code as seed data. The schema will already
   be validated by the fact that it rendered.

---

## Two decisions to make before building

**1. Nationality exclusions.** `app_0014` is a strong Nigerian candidate auto-rejected because
a Ghanaian school's posting excludes Nigerian nationals for work-permit reasons. Competitors
do this as a silent filter. Your options: reject silently, tell the candidate the specific
reason, or prevent the application upfront with the restriction stated on the posting. The
third wastes the least of the candidate's time but makes the restriction publicly visible on
your platform. Decide with your partner before it ships.

**2. Who may change ranking priorities, and when.** Right now `edit_ranking_criteria` sits with
HR and principals, not coordinators. Worth also deciding whether criteria can be changed after
candidates have applied — the data assumes yes, and keeps `previousRankingCriteria` so the
change is auditable. If a candidate could ever see their own rank, changing the criteria
mid-process becomes something you have to disclose.

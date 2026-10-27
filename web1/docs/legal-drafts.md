# Privacy policy and terms — working drafts

Rescued from `web2` before that prototype was deleted on 2026-10-27. These are
**the words, not the pages**: the markup they lived in used web2's design
system and was not worth porting, but the text was written against this
product's actual commitments — document isolation, the access log, export and
deletion as first-class — and it would be a waste to rewrite it from memory.

Both say, in their own first paragraph, that they are drafts awaiting counsel.
Keep that sentence until counsel has in fact seen them.

Building the real pages is a small job: web1's `globals.css` already has
`.wrap`, `.measure`, `.lede`, `.body`, `.label` and `.hair`, so it needs a
shell component and these two files of content. The footer will want to link
to them before anybody outside the two of you sees the site.

---

## Privacy policy

*Last updated in the draft: 29 September 2026*

This is a working draft written while the product is being built. It describes
what we intend to do and will be reviewed by counsel before the platform opens.

### What we collect

For teachers: the profile you build, the curricula you have taught, your work
history, the documents you upload, the referees you name, and the applications
you send.

For schools: the institution details we verify, the users you add and the
permissions you give them, your postings, and the notes your team writes on
candidates.

### Where documents live

Passports, diplomas and certificates go into storage kept apart from the rest
of the product. They are reached through links that expire, never through
public URLs.

Every time somebody opens one of those documents we record who it was and
when. You can ask us for that record.

### Who can see your profile

You choose: public, private, or visible only to the schools you have applied
to. A school shortlist is never shown to the candidates on it.

### Export and deletion

You can export everything we hold about you, or delete your account and its
contents, from inside the product. It is not a form and not a support ticket,
and it works in every market we operate in.

Some records are kept after deletion where the law requires it, such as
invoices. We will tell you which.

### What we do not do

We do not sell your data, and we do not use your documents to train models.

---

## Terms of service

*Last updated in the draft: 29 September 2026*

A working draft, written while the product is being built and subject to
review by counsel before the platform opens.

### Accounts

Teacher accounts are free and stay free. You are responsible for the accuracy
of what you put in your profile, including the referees you name.

School accounts run on a plan priced by total student enrollment rather than
per posting. Users within a school hold different permissions depending on
their role.

### Verification

We verify a school as an institution before its postings go live. We request
references from the supervisor at the school a candidate names, and we show
the status of each request to both sides.

A reference that has not been confirmed is labelled as such. We do not
describe anything as verified before it is.

### What we do not promise

We do not guarantee a placement, a shortlist, or a reply within any particular
time. We do ask schools for a reason when an application goes quiet, and we
pass that reason to the candidate.

### Ending it

You can close a teacher account at any time from inside the product. A school
plan runs to the end of its current term and is not renewed automatically
without notice.

---

## Settled: pricing is by enrollment

The terms were right and the code is wrong. On 2026-10-27 the founder
confirmed that a school plan is priced by **total student enrollment**, not by
job-posting count. `CLAUDE.md` has been corrected.

`0009_billing` has not: `plans` still carries `job_posting_limit`,
`application_limit_per_cycle` and `seats`, and the sample plans are shaped
around postings (starter 5, growth 25, district unlimited). That is a real
migration — a plan needs an enrollment band, and `schools.student_count`
already exists to put a school into one — but it was deliberately left out of
the late-October testing sprint, which is about auth, profiles, posting a job
and applying. Nobody is billed yet, so it costs nothing to wait; it costs a
lot to discover after the first invoice.

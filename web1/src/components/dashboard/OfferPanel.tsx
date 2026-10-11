"use client";

import { useState } from "react";
import type { OfferContext, CandidateApplication } from "@/lib/dashboard-data";

/**
 * The offer, and what answering it would mean.
 *
 * Accepting relocates a family of four across the world, so there is no
 * one-click Accept on the card. Reviewing is the inviting action; accepting
 * sits behind the terms, where it can be read against this particular
 * person's situation rather than presented as a generic yes.
 *
 * Each term is checked against the candidate: the band's floor against what
 * he asked for, the tuition against the children he actually has, the start
 * date against when he is free. A term that does not clear says so.
 *
 * Declining is always available and never buried, because an offer you cannot
 * decline is not an offer.
 */
export function OfferPanel({
  application: a, context: ctx,
}: {
  application: CandidateApplication;
  context: OfferContext;
}) {
  const [open, setOpen] = useState(false);

  const terms = buildTerms(a, ctx);
  const blocker = permitBlocker(ctx, a.startDate);

  return (
    <div className="offer">
      <div className="offer-actions">
        <button type="button" className="btn btn-accent" aria-expanded={open}
                onClick={() => setOpen((v) => !v)}>
          {open ? "Hide the terms" : "Review the offer"}
        </button>
        <span className="readout">
          Offered {a.daysSinceStageChange}d ago
          {a.contractLengthYears && ` · ${a.contractLengthYears}-year contract`}
        </span>
      </div>

      <div className="offer-body" data-open={open || undefined} aria-hidden={!open}>
        <div className="offer-clip">
          <div className="offer-inner">
            <dl className="offer-terms">
              {terms.map((t) => (
                <div key={t.label} data-tone={t.tone}>
                  <dt className="readout">{t.label}</dt>
                  <dd>
                    <strong>{t.value}</strong>
                    {t.note && <span>{t.note}</span>}
                  </dd>
                </div>
              ))}
            </dl>

            {blocker && (
              <p className="offer-blocker">
                <span className="chip chip-critical">
                  <span className="dot" style={{ background: "currentColor" }} />
                  Before you accept
                </span>
                <span>{blocker}</span>
              </p>
            )}

            <div className="offer-decide">
              <button type="button" className="btn btn-accent">Accept this offer</button>
              <button type="button" className="btn btn-quiet">Ask a question first</button>
              <button type="button" className="btn offer-decline">Decline</button>
            </div>

            <p className="offer-foot readout">
              No respond-by date was set on this offer. Answering is still yours
              to time.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

type Term = { label: string; value: string; note?: string; tone: "ok" | "watch" | "plain" };

function buildTerms(a: CandidateApplication, ctx: OfferContext): Term[] {
  const out: Term[] = [];
  const k = (n: number) => `$${(n / 1000).toFixed(0)}k`;

  if (a.salaryMinUsd != null && a.salaryMaxUsd != null) {
    const asked = ctx.salaryExpectationMinUsd;
    const short = asked != null && a.salaryMinUsd < asked;
    out.push({
      label: "Salary band",
      value: `${k(a.salaryMinUsd)} – ${k(a.salaryMaxUsd)}`,
      note: asked == null ? undefined
        : short
          ? `The floor sits below the ${k(asked)} you asked for. Where you land in the band is what to negotiate.`
          : `Clears the ${k(asked)} you asked for.`,
      tone: short ? "watch" : "ok",
    });
  }

  out.push({
    label: "Housing",
    value: a.housingProvided ? "Provided" : "Not provided",
    tone: a.housingProvided ? "ok" : "watch",
  });

  const covered = a.dependentTuitionCovered;
  const enough = covered >= ctx.dependents;
  out.push({
    label: "Dependent tuition",
    value: covered > 0 ? `${covered} covered` : "Not covered",
    note: ctx.dependents === 0 ? undefined
      : enough
        ? `Covers both of your dependents.`
        : `You have ${ctx.dependents}; ${covered} ${covered === 1 ? "is" : "are"} covered.`,
    tone: ctx.dependents === 0 ? "plain" : enough ? "ok" : "watch",
  });

  if (a.startDate) {
    const free = ctx.availableFrom;
    const ready = free != null && new Date(free) <= new Date(a.startDate);
    out.push({
      label: "Starts",
      value: new Date(a.startDate).toLocaleDateString("en-GB",
        { day: "numeric", month: "long", year: "numeric" }),
      note: a.academicYear ? `${a.academicYear} academic year.` : undefined,
      tone: ready ? "ok" : "watch",
    });
  }

  return out;
}

/**
 * The thing most likely to turn an accepted offer into a withdrawn one.
 * Stated as a consequence, not a status — "expires in 42 days" means nothing
 * to someone who has not met the six-month rule.
 */
function permitBlocker(ctx: OfferContext, startDate: string | null): string | null {
  const p = ctx.passport;
  if (!p) return null;
  if (p.status === "rejected" || p.status === "expired")
    return "Your passport is not currently valid on file, and a work permit cannot be started without it. Sort this before you answer.";
  if (p.daysUntilExpiry != null && p.daysUntilExpiry < 180) {
    const when = startDate
      ? ` You would be applying for the permit well before the ${new Date(startDate)
          .toLocaleDateString("en-GB", { month: "long", year: "numeric" })} start.`
      : "";
    return `Your passport expires in ${p.daysUntilExpiry} days. Most work permits need six months of validity left when the application is filed, so renewing it is the first thing that has to happen after you say yes — possibly before.${when}`;
  }
  return null;
}

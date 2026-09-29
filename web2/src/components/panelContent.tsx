"use client";

import {
  CaretDown,
  ChatCircleDots,
  Eye,
  FolderLock,
  FunnelSimple,
  LockKey,
  SealCheck,
  UsersThree,
} from "@phosphor-icons/react/dist/ssr";
import { useState } from "react";

/* Condensed for the panel: one line per idea, no section furniture. */

const STEPS = [
  {
    icon: SealCheck,
    title: "Verify",
    body: "Schools are checked as institutions before a posting goes live. Documents sit in storage kept apart from the product, behind links that expire.",
  },
  {
    icon: FunnelSimple,
    title: "Match",
    body: "Search the entire pool, not just applicants. Rank it and every position shows its reasons, or switch ranking off entirely.",
  },
  {
    icon: ChatCircleDots,
    title: "Answer",
    body: "Applications move through stages both sides see. When one goes quiet we ask the school why and pass it on.",
  },
];

const RULES = [
  { icon: Eye, t: "Explainable ranking", b: "Every suggestion carries its reasons." },
  { icon: LockKey, t: "Messaging opens at interview", b: "One signal of interest before that." },
  { icon: FolderLock, t: "Documents kept apart", b: "Expiring links and a record of every view." },
  { icon: UsersThree, t: "Roles from the first migration", b: "HR, principal and coordinator differ." },
];

export function HowPanel() {
  return (
    <>
      <h2 className="panel-title">Three things happen, in order.</h2>
      <p className="panel-lede">
        The same funnel from both ends. A school sees one side of it, a teacher
        the other.
      </p>

      <ol className="mt-6 flex flex-col gap-4">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          return (
            <li key={s.title} className="flex gap-4 border-t border-[color:var(--color-line)] pt-4">
              <span className="panel-icon">
                <Icon size={18} aria-hidden="true" />
              </span>
              <div>
                <h3 className="text-base font-semibold">
                  {i + 1}. {s.title}
                </h3>
                <p className="mt-1 text-sm text-[color:var(--color-ink-3)]">
                  {s.body}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      <h3 className="mt-8 text-base font-semibold">What it will not do</h3>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {RULES.map((r) => {
          const Icon = r.icon;
          return (
            <li key={r.t} className="flex gap-3 border-t border-[color:var(--color-line)] pt-3">
              <span className="text-[color:var(--color-gold-deep)]">
                <Icon size={16} aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold">{r.t}</p>
                <p className="mt-0.5 text-sm text-[color:var(--color-mute)]">
                  {r.b}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}

const CITIES = [
  { city: "Seoul", country: "South Korea" },
  { city: "Busan", country: "South Korea" },
  { city: "Bogotá", country: "Colombia" },
  { city: "Medellín", country: "Colombia" },
  { city: "São Paulo", country: "Brazil" },
  { city: "Rio de Janeiro", country: "Brazil" },
  { city: "Bangkok", country: "Thailand" },
  { city: "Mexico City", country: "Mexico" },
  { city: "Lisbon", country: "Portugal" },
];

export function WherePanel() {
  return (
    <>
      <h2 className="panel-title">New schools and new countries, every day.</h2>
      <p className="panel-lede">
        Schools are joining faster than we can put them on a map, and the number
        has only gone one way. These are some of the cities already with us.
      </p>

      <ul className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
        {CITIES.map((c) => (
          <li key={c.city} className="border-t border-[color:var(--color-line)] pt-3">
            <p className="text-base font-semibold text-[color:var(--color-ink)]">
              {c.city}
            </p>
            <p className="mt-0.5 text-sm text-[color:var(--color-mute)]">
              {c.country}
            </p>
          </li>
        ))}
      </ul>

      <p className="mt-6 text-sm text-[color:var(--color-ink-3)]">
        Not seeing yours? Tell us where you teach or hire and we will start
        there next.
      </p>
    </>
  );
}

const QUESTIONS = [
  {
    q: "What does it cost?",
    a: "Teachers pay nothing, for everything. Schools pay a plan based on total student enrollment rather than per posting, so a second role in the same term costs no more than the first.",
  },
  {
    q: "Which countries are you open in?",
    a: "We opened in South Korea, Colombia and Brazil, and new countries are being added continuously. If yours is not live yet, tell us and it moves up the list.",
  },
  {
    q: "Can a school turn the ranking off?",
    a: "Yes, in one place, and the pool is then browsed unordered. When it is on, every position carries its reasons.",
  },
  {
    q: "How are references checked?",
    a: "Requested from the supervisor at the school a candidate names, not from a personal address they supply. The status stays visible to both sides while it is pending.",
  },
  {
    q: "Where do passports and diplomas live?",
    a: "In storage separate from the product, behind links that expire, with a record of who opened which document and when.",
  },
  {
    q: "Can I export or delete my data?",
    a: "From inside the product, on the first day it exists, in every market we operate in. Not a form and not a fourteen day wait.",
  },
];

export function QuestionsPanel() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <>
      <h2 className="panel-title">The things schools ask us first.</h2>
      <p className="panel-lede">
        If yours is not here, write to us and we will answer it and add it.
      </p>

      <ul className="mt-6">
        {QUESTIONS.map((item, i) => {
          const isOpen = open === i;
          return (
            <li key={item.q} className="border-t border-[color:var(--color-line)] last:border-b">
              <h3>
                <button
                  type="button"
                  className="faq-trigger"
                  aria-expanded={isOpen}
                  aria-controls={`panel-faq-${i}`}
                  id={`panel-faq-button-${i}`}
                  onClick={() => setOpen(isOpen ? null : i)}
                >
                  <span className="text-base font-semibold text-[color:var(--color-ink)]">
                    {item.q}
                  </span>
                  <span className="faq-caret" data-open={isOpen || undefined}>
                    <CaretDown size={18} weight="bold" aria-hidden="true" />
                  </span>
                </button>
              </h3>
              <div
                className="faq-panel"
                data-open={isOpen || undefined}
                id={`panel-faq-${i}`}
                role="region"
                aria-labelledby={`panel-faq-button-${i}`}
              >
                <div className="overflow-hidden">
                  <p className="pb-4 text-sm text-[color:var(--color-ink-3)]">
                    {item.a}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}

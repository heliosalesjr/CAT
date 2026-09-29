"use client";

import { ArrowRight, PaperPlaneTilt } from "@phosphor-icons/react/dist/ssr";
import { useEffect, useRef, useState } from "react";
import { PanelButton, type PanelId } from "./panels";

const LINES = [
  "Nobody should wait six weeks to hear nothing back.",
  "Nobody should read four hundred applications in the order they arrived.",
];

const DOORS: { id: PanelId; label: string; note: string }[] = [
  { id: "how", label: "How it works", note: "Verify, match, answer" },
  { id: "where", label: "Where we hire", note: "Six cities, three countries" },
  { id: "questions", label: "Questions", note: "Cost, references, your data" },
];

type Status = "idle" | "invalid" | "sending" | "sent";

/**
 * The only section under the hero.
 *
 * It carries the three jobs the page still has to do: say the thing in
 * its own voice, take the one action, and open the doors to everything
 * that used to be stacked down the page. B11 asks for the tagline to
 * be its own moment away from the hero; with a single section left,
 * the top of this one is as far as it can sit.
 */
export function Gateway() {
  const root = useRef<HTMLDivElement>(null);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  /**
   * B11 tagline reveal: each word takes the full text colour as it
   * crosses a line near the middle of the viewport, in reading order.
   *
   * B7 allows either an observer per word or one scroll listener
   * throttled through requestAnimationFrame, and this takes the second
   * route deliberately. Per word observers can leave a word stranded at
   * 30% opacity if it never generates an intersection: an anchor jump
   * straight past the block, a flick of the wheel, or a viewport short
   * enough that the line clears a word between frames. Reading the
   * positions on each frame cannot miss one, and the listener removes
   * itself once the last word is lit, so it costs nothing afterwards.
   */
  useEffect(() => {
    const el = root.current;
    if (!el) return;

    const words = Array.from(el.querySelectorAll<HTMLElement>(".tagline-word"));
    if (!words.length) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      words.forEach((w) => w.classList.add("is-lit"));
      return;
    }

    let pending = 0;
    let remaining = words.slice();

    const sweep = () => {
      pending = 0;
      const line = window.innerHeight * 0.55;
      remaining = remaining.filter((w) => {
        if (w.getBoundingClientRect().top >= line) return true;
        w.classList.add("is-lit");
        return false;
      });
      if (!remaining.length) detach();
    };

    const schedule = () => {
      if (pending) return;
      pending = requestAnimationFrame(sweep);
    };

    function detach() {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (pending) cancelAnimationFrame(pending);
    }

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    sweep();

    return detach;
  }, []);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
      setStatus("invalid");
      return;
    }
    setStatus("sending");
    // No endpoint yet: stands in until the waiting list is wired up.
    window.setTimeout(() => setStatus("sent"), 700);
  };

  return (
    <section id="start" className="scroll-mt-24 py-20 md:py-24" ref={root}>
      <div className="shell">
        <p className="tagline max-w-[680px] text-2xl font-semibold md:text-4xl">
          {LINES.map((line, li) => (
            <span key={li} className="block">
              {line.split(" ").map((word, wi) => (
                <span key={wi} className="tagline-word">
                  {word}{" "}
                </span>
              ))}
            </span>
          ))}
        </p>

        <div className="mt-12 grid gap-12 md:grid-cols-2 md:gap-16">
          <div>
            <h2 className="text-xl font-semibold">Join the first group</h2>
            <p className="mt-2 text-base text-[color:var(--color-ink-3)]">
              Free for teachers, and it stays free. We write when the first
              schools go live, and not otherwise.
            </p>

            <form className="mt-6" onSubmit={onSubmit} noValidate>
              <label htmlFor="join-email" className="sr-only">
                Your email address
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  id="join-email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="you@school.edu"
                  className="field field-light"
                  value={email}
                  aria-invalid={status === "invalid"}
                  aria-describedby="join-msg"
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (status !== "idle") setStatus("idle");
                  }}
                />
                <button
                  type="submit"
                  className="btn btn-gold"
                  disabled={status === "sending" || status === "sent"}
                >
                  <PaperPlaneTilt size={18} aria-hidden="true" />
                  {status === "sending"
                    ? "Adding you"
                    : status === "sent"
                      ? "On the list"
                      : "Join"}
                </button>
              </div>

              <p
                id="join-msg"
                role="status"
                className="mt-3 text-sm"
                style={{
                  color:
                    status === "invalid"
                      ? "var(--color-gold-deep)"
                      : "var(--color-mute)",
                }}
              >
                {status === "invalid" &&
                  "That address is missing an @ or a domain. Please check it."}
                {status === "sent" && "Saved. We will be in touch."}
                {(status === "idle" || status === "sending") &&
                  "One email when it opens. Nothing else."}
              </p>
            </form>
          </div>

          <nav aria-label="Rest of the site">
            <h2 className="text-xl font-semibold">The detail</h2>
            <ul className="mt-6">
              {DOORS.map((d) => (
                <li key={d.id}>
                  <PanelButton id={d.id} className="door">
                    <span>
                      <span className="block text-lg font-semibold">
                        {d.label}
                      </span>
                      <span className="mt-1 block text-sm text-[color:var(--color-mute)]">
                        {d.note}
                      </span>
                    </span>
                    <ArrowRight size={20} aria-hidden="true" />
                  </PanelButton>
                </li>
              ))}
              <li className="border-t border-[color:var(--color-line)]" />
            </ul>
          </nav>
        </div>
      </div>
    </section>
  );
}

"use client";

import { useLayoutEffect, useRef } from "react";

/**
 * FLIP, with the Web Animations API.
 *
 * When the shortlist reorders, the rows have to visibly travel. A list that
 * simply re-paints in a new order reads as a glitch; watching a candidate climb
 * is the explanation for why the order changed, which is the whole point of the
 * ranking control.
 *
 * WAAPI rather than Framer Motion: these are transform-only keyframes that run
 * off the main thread, so they hold up while the page is still fetching. It is
 * also the one API that gives JS control without shipping a library.
 *
 * Positions are read in useLayoutEffect, after React has committed the new
 * order but before the browser paints it, so the row is moved back to where it
 * was and animated forward from there. The user never sees the jump.
 */
export function useFlip<T extends HTMLElement>(key: unknown) {
  const ref = useRef<T>(null);
  const previous = useRef(new Map<string, number>());

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;

    const rows = Array.from(root.querySelectorAll<HTMLElement>("[data-flip-key]"));
    const next = new Map<string, number>();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    for (const row of rows) {
      const id = row.dataset.flipKey!;
      const top = row.offsetTop;
      next.set(id, top);

      const was = previous.current.get(id);
      if (was == null || was === top || reduced) continue;

      // Cancel anything still in flight on this row, so a second toggle
      // retargets from a clean state instead of stacking transforms.
      for (const a of row.getAnimations()) if (a.playState === "running") a.cancel();

      row.animate(
        [{ transform: `translateY(${was - top}px)` }, { transform: "translateY(0)" }],
        {
          duration: 260,
          // Strong ease-out: the row leaves immediately, which is the frame the
          // eye is watching, and settles without a bounce. This is a page about
          // people waiting 45 days for an answer; it should not feel playful.
          easing: "cubic-bezier(0.23, 1, 0.32, 1)",
        },
      );
    }

    previous.current = next;
  }, [key]);

  return ref;
}

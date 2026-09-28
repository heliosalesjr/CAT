"use client";

import { useEffect, useRef } from "react";

/** Travel, in px, for the low / mid / high elevation bands. */
const DEPTH = [5, 12, 21];
/** How hard the layers chase the cursor. Lower trails more. */
const EASE = 0.065;

type Props = {
  /** Server-rendered contour bands — the path data never reaches the client. */
  low: React.ReactNode;
  mid: React.ReactNode;
  high: React.ReactNode;
};

/**
 * Parallax over the hero's terrain.
 *
 * The three elevation bands slide by different amounts as the cursor
 * moves, so the map gains depth instead of sitting flat. Nothing
 * follows the pointer directly: each band eases towards its target in a
 * rAF loop, because motion tied one-to-one to the mouse reads as
 * mechanical. Transforms are written straight onto the elements rather
 * than through an inherited custom property, which would restyle every
 * path in the SVG on each frame.
 *
 * Fine pointers only, and it never starts under reduced motion.
 */
export function HeroTerrain({ low, mid, high }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const bands = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const el = root.current;
    if (!el) return;

    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!fine.matches || still.matches) return;

    const section = el.closest<HTMLElement>("[data-stage]") ?? el;

    let pointerX = 0;
    let pointerY = 0;
    let active = false;
    let frame = 0;

    const state = DEPTH.map(() => ({ x: 0, y: 0, tx: 0, ty: 0 }));

    const onMove = (e: PointerEvent) => {
      pointerX = e.clientX;
      pointerY = e.clientY;
      active = true;
    };

    const onLeave = () => {
      active = false;
      for (const s of state) {
        s.tx = 0;
        s.ty = 0;
      }
    };

    const tick = () => {
      frame = requestAnimationFrame(tick);

      if (active) {
        // One layout read per frame, before any write, so reads and
        // writes never interleave.
        const box = el.getBoundingClientRect();
        if (box.width > 0) {
          const ox = (pointerX - box.left) / box.width - 0.5;
          const oy = (pointerY - box.top) / box.height - 0.5;
          DEPTH.forEach((d, i) => {
            state[i].tx = -ox * d * 2;
            state[i].ty = -oy * d * 2;
          });
        }
      }

      state.forEach((s, i) => {
        s.x += (s.tx - s.x) * EASE;
        s.y += (s.ty - s.y) * EASE;
        const node = bands.current[i];
        if (node) {
          node.style.transform =
            `translate3d(${s.x.toFixed(2)}px, ${s.y.toFixed(2)}px, 0)`;
        }
      });
    };

    section.addEventListener("pointermove", onMove);
    section.addEventListener("pointerleave", onLeave);
    frame = requestAnimationFrame(tick);

    return () => {
      section.removeEventListener("pointermove", onMove);
      section.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={root} className="terrain-probe" aria-hidden="true">
      {[low, mid, high].map((layer, i) => (
        <div
          key={i}
          className="terrain-band"
          ref={(node) => {
            bands.current[i] = node;
          }}
        >
          {layer}
        </div>
      ))}
    </div>
  );
}

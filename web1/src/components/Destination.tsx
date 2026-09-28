"use client";

import { useEffect, useRef, useState } from "react";
import { CITIES } from "./cities";

const DWELL = 3400;

/**
 * The rotating destination in the headline.
 *
 * Three things move together, which is what stops it reading as a word
 * swap on a timer:
 *
 *  1. the letters leave upward and arrive from below, staggered, so the
 *     word assembles rather than appears;
 *  2. a hairline wipes across underneath, left to right, the way a
 *     surveyor's rule is drawn;
 *  3. the contour field behind the whole hero glides to that city's
 *     coordinates — handled by writing the pan onto the stage element,
 *     so the heavy terrain stays server-rendered and never enters the
 *     client bundle.
 *
 * The word sits on a line of its own, so "Seoul" and "Ho Chi Minh"
 * never reflow the copy beneath them.
 */
export function Destination() {
  const ref = useRef<HTMLSpanElement>(null);
  const [index, setIndex] = useState(0);
  const [previous, setPrevious] = useState<number | null>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduced.matches) return;

    const t = setInterval(() => {
      setIndex((i) => {
        setPrevious(i);
        return (i + 1) % CITIES.length;
      });
    }, DWELL);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const stage = ref.current?.closest<HTMLElement>("[data-stage]");
    if (!stage) return;
    const city = CITIES[index];
    stage.style.setProperty("--pan-x", `${city.pan[0]}px`);
    stage.style.setProperty("--pan-y", `${city.pan[1]}px`);
    stage.style.setProperty("--pan-s", `${city.scale}`);
  }, [index]);

  const city = CITIES[index];
  const leaving = previous === null ? null : CITIES[previous];

  return (
    <span className="destination" ref={ref}>
      {/* Reserves the tallest line box so the headline never jumps. */}
      <span className="destination-stack">
        {leaving && (
          <span className="destination-word is-leaving" key={`out-${previous}`} aria-hidden="true">
            {[...leaving.name].map((ch, i) => (
              <span
                key={i}
                className="destination-char"
                style={{ "--i": i } as React.CSSProperties}
              >
                {ch === " " ? " " : ch}
              </span>
            ))}
          </span>
        )}

        <span className="destination-word is-arriving" key={`in-${index}`}>
          {[...city.name].map((ch, i) => (
            <span
              key={i}
              className="destination-char"
              style={{ "--i": i } as React.CSSProperties}
            >
              {ch === " " ? " " : ch}
            </span>
          ))}
        </span>
      </span>

      <span className="destination-rule" key={`rule-${index}`} aria-hidden="true" />

      <span className="destination-coords" key={`co-${index}`}>
        <span className="destination-cc">{city.cc}</span>
        {city.coords}
      </span>
    </span>
  );
}

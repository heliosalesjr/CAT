"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { CITY_IMAGES } from "./cityImages";

const DWELL = 7000;

/**
 * One photograph at a time, crossfading on a slow timer.
 *
 * All three frames stay mounted and only their opacity changes, so the
 * browser composites the fade instead of loading anything mid
 * transition. Under reduced motion the timer never starts and the
 * first frame simply stays.
 */
export function HeroBackdrop() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(
      () => setIndex((i) => (i + 1) % CITY_IMAGES.length),
      DWELL,
    );
    return () => clearInterval(t);
  }, []);

  const current = CITY_IMAGES[index];

  return (
    <>
      <div className="hero-bg" aria-hidden="true">
        {CITY_IMAGES.map((img, i) => (
          <div
            key={img.src}
            className="hero-frame"
            data-on={i === index || undefined}
          >
            <Image
              src={img.src}
              alt=""
              fill
              sizes="100vw"
              quality={90}
              priority={i === 0}
              className="object-cover"
            />
          </div>
        ))}
      </div>

      <div className="hero-scrim" aria-hidden="true" />

      {/* Credit for the frame on screen, small and out of the way. */}
      <p className="hero-credit" key={current.src}>
        <span className="hero-credit-city">{current.city}</span>
        {", "}
        {current.country} · Photograph by {current.photographer}
      </p>
    </>
  );
}

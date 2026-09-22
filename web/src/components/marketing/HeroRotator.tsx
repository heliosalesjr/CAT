"use client";

import { useEffect, useState } from "react";

const DESTINATIONS = [
  "Seoul",
  "Shanghai",
  "Bogotá",
  "Accra",
  "Barcelona",
  "Beijing",
  "Ho Chi Minh",
];

export function HeroRotator() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % DESTINATIONS.length);
    }, 2400);
    return () => clearInterval(t);
  }, []);

  return (
    <span className="hero-rotator">
      <span key={index} className="hero-rotator-word">
        {DESTINATIONS[index]}
      </span>
    </span>
  );
}

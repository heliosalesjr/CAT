"use client";

import { useEffect, useState } from "react";

export type Typeface = "archivo" | "cinzel" | "googlesans" | "roboto";

export const FACES: { id: Typeface; name: string; note: string }[] = [
  { id: "archivo", name: "Archivo", note: "expanded grotesk · current" },
  { id: "cinzel", name: "Cinzel", note: "roman capitals · carved" },
  { id: "googlesans", name: "Google Sans", note: "geometric · grade 120" },
  { id: "roboto", name: "Roboto", note: "neutral · no expanded width" },
];

const KEY = "cat-typeface";

/**
 * Temporary control for choosing the heading typeface in the browser.
 *
 * Click the pill or press F to cycle. The choice is stored, and an
 * inline script in the layout applies it before first paint, so a
 * reload never flashes the previous face.
 *
 * This is scaffolding for a decision, not a feature: see the
 * TYPEFACE_PREVIEW block in app/layout.tsx for how to strip it.
 */
export function TypefaceSwitch() {
  const [index, setIndex] = useState(0);

  // Pick up whatever the pre-paint script restored.
  useEffect(() => {
    const current = (document.documentElement.dataset.typeface ??
      "archivo") as Typeface;
    const at = FACES.findIndex((f) => f.id === current);
    if (at > 0) setIndex(at);
  }, []);

  useEffect(() => {
    const face = FACES[index];
    const root = document.documentElement;
    if (face.id === "archivo") delete root.dataset.typeface;
    else root.dataset.typeface = face.id;
    try {
      localStorage.setItem(KEY, face.id);
    } catch {
      /* private browsing; the switch still works for this session */
    }
  }, [index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "f" && e.key !== "F") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        return;
      }
      setIndex((i) => (i + 1) % FACES.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const face = FACES[index];

  return (
    <button
      type="button"
      className="typeface-switch"
      onClick={() => setIndex((i) => (i + 1) % FACES.length)}
      aria-label={`Heading typeface: ${face.name}. Click or press F for the next one.`}
    >
      <span className="typeface-switch-dot" aria-hidden="true" />
      <span className="typeface-switch-name">{face.name}</span>
      <span className="typeface-switch-note">{face.note}</span>
      <kbd className="typeface-switch-key">F</kbd>
    </button>
  );
}

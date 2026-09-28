"use client";

import { useEffect, useRef, useState } from "react";

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
 * Collapsed it is a 22px mark in the corner at very low opacity —
 * present if you know it is there, invisible in a screen share.
 * Double-click opens it; double-click the mark again, or Escape,
 * closes it. F cycles at any time, which is the path to use while
 * presenting, since it needs no pointer at all.
 *
 * Only the collapsed mark listens for double-click, and it has no
 * single-click handler: if clicking also cycled, a double-click would
 * fire two cycles on its way to opening the panel.
 *
 * This is scaffolding for a decision, not a feature: see the
 * TYPEFACE_PREVIEW block in app/layout.tsx for how to strip it.
 */
export function TypefaceSwitch() {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  // Pick up whatever the pre-paint script restored.
  useEffect(() => {
    const current = (document.documentElement.dataset.typeface ??
      "archivo") as Typeface;
    const at = FACES.findIndex((f) => f.id === current);
    if (at > 0) setIndex(at);
  }, []);

  useEffect(() => {
    const face = FACES[index];
    const html = document.documentElement;
    if (face.id === "archivo") delete html.dataset.typeface;
    else html.dataset.typeface = face.id;
    try {
      localStorage.setItem(KEY, face.id);
    } catch {
      /* private browsing; the switch still works for this session */
    }
  }, [index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      const typing =
        el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;

      if (e.key === "Escape" && open) {
        setOpen(false);
        return;
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "f" || e.key === "F") {
        setIndex((i) => (i + 1) % FACES.length);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Clicking anywhere else puts it away.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [open]);

  const face = FACES[index];

  return (
    <div className="typeface-switch" ref={root} data-open={open || undefined}>
      <div className="typeface-panel" inert={!open}>
        <div className="typeface-panel-head">
          <span>Typeface</span>
          <span className="typeface-panel-esc">esc</span>
        </div>

        <ul className="typeface-list">
          {FACES.map((f, i) => (
            <li key={f.id}>
              <button
                type="button"
                className="typeface-option"
                data-active={i === index || undefined}
                onClick={() => setIndex(i)}
              >
                <span className="typeface-option-mark" aria-hidden="true" />
                <span className="typeface-option-name">{f.name}</span>
                <span className="typeface-option-note">{f.note}</span>
              </button>
            </li>
          ))}
        </ul>

        <p className="typeface-panel-foot">F cycles · double-click to close</p>
      </div>

      <button
        type="button"
        className="typeface-dot"
        onDoubleClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key !== "Enter" && e.key !== " ") return;
          // Stop the browser synthesising a click, which would make a
          // single mouse click open it too.
          e.preventDefault();
          setOpen((v) => !v);
        }}
        aria-expanded={open}
        aria-label={`Heading typeface: ${face.name}. Double-click to open the picker, or press F to cycle.`}
        title={`${face.name} — double-click`}
      >
        <span aria-hidden="true" />
      </button>
    </div>
  );
}

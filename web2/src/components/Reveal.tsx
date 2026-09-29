"use client";

import { useEffect, useRef } from "react";

type Props = {
  children: React.ReactNode;
  /** Stagger within a group, in ms. */
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li" | "article" | "header";
};

/**
 * B7 scroll interpolation: a heavy fade up with blur as the element
 * enters the viewport.
 *
 * IntersectionObserver, never a scroll listener. Installing the
 * observer also marks the document ready, which cancels the boot
 * script's 3 second failsafe; if this component never runs, that
 * failsafe strips the hiding styles so nothing is stranded invisible.
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
  as = "div",
}: Props) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-anim-ready", "");

    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === "undefined") {
      el.classList.add("reveal-in");
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        el.classList.add("reveal-in");
        io.disconnect();
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.01 },
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  const Tag = as as React.ElementType;

  return (
    <Tag
      ref={ref}
      className={`reveal ${className}`}
      style={delay ? ({ "--reveal-delay": `${delay}ms` } as React.CSSProperties) : undefined}
    >
      {children}
    </Tag>
  );
}

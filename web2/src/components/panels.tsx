"use client";

import { X } from "@phosphor-icons/react/dist/ssr";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { HowPanel, QuestionsPanel, WherePanel } from "./panelContent";

export type PanelId = "how" | "where" | "questions";

export const PANEL_TITLES: Record<PanelId, string> = {
  how: "How it works",
  where: "Where we hire",
  questions: "Questions",
};

type Ctx = { open: (id: PanelId) => void; close: () => void; current: PanelId | null };

const PanelCtx = createContext<Ctx | null>(null);

export function usePanels() {
  const ctx = useContext(PanelCtx);
  if (!ctx) throw new Error("usePanels must be used inside PanelProvider");
  return ctx;
}

/**
 * The menu items open a panel over the page rather than navigating.
 *
 * Built on a native <dialog> opened with showModal, which brings the
 * focus trap, Escape to close and inertness of the page behind it for
 * free. Rebuilding those on a div is how modals end up letting you tab
 * into the page underneath.
 */
export function PanelProvider({ children }: { children: React.ReactNode }) {
  const [current, setCurrent] = useState<PanelId | null>(null);
  const ref = useRef<HTMLDialogElement>(null);

  const open = useCallback((id: PanelId) => setCurrent(id), []);
  const close = useCallback(() => setCurrent(null), []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (current && !el.open) el.showModal();
    if (!current && el.open) el.close();
  }, [current]);

  return (
    <PanelCtx.Provider value={{ open, close, current }}>
      {children}

      <dialog
        ref={ref}
        className="panel"
        aria-label={current ? PANEL_TITLES[current] : undefined}
        onClose={close}
        onCancel={close}
        // Clicking the backdrop lands on the dialog itself, not its content.
        onClick={(e) => {
          if (e.target === ref.current) close();
        }}
      >
        {current && (
          <div className="panel-inner">
            <button
              type="button"
              className="panel-close"
              onClick={close}
              aria-label="Close"
            >
              <X size={18} weight="bold" aria-hidden="true" />
            </button>

            <div className="panel-body">
              {current === "how" && <HowPanel />}
              {current === "where" && <WherePanel />}
              {current === "questions" && <QuestionsPanel />}
            </div>
          </div>
        )}
      </dialog>
    </PanelCtx.Provider>
  );
}

/** A menu or footer item that opens a panel. */
export function PanelButton({
  id,
  className,
  children,
}: {
  id: PanelId;
  className?: string;
  children: React.ReactNode;
}) {
  const { open, current } = usePanels();
  return (
    <button
      type="button"
      className={className}
      aria-haspopup="dialog"
      aria-current={current === id ? "true" : undefined}
      onClick={() => open(id)}
    >
      {children}
    </button>
  );
}

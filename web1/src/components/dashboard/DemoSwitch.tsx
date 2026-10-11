import Link from "next/link";

/**
 * Scaffolding for the review, not a product feature: it swaps the dashboard
 * between the three states the brief asks for. Server-rendered through the
 * query string, so a link reproduces exactly what someone is looking at.
 * Delete this component and the searchParams in page.tsx to strip it.
 */
export function DemoSwitch({ view }: { view: string }) {
  const options = [
    { id: "hr", label: "Melissa · HR", note: "full permissions" },
    { id: "coordinator", label: "Lara · Coordinator", note: "no salary, documents or ranking edit" },
    { id: "empty", label: "New school", note: "nothing posted yet" },
  ];
  return (
    <div className="demo-switch">
      <span className="readout">Viewing as</span>
      {options.map((o) => (
        <Link key={o.id} href={`?view=${o.id}`}
              className={`demo-opt${view === o.id ? " is-on" : ""}`}
              aria-current={view === o.id ? "true" : undefined}>
          {o.label}
          <span className="readout">{o.note}</span>
        </Link>
      ))}
    </div>
  );
}

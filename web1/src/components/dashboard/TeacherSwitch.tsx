import Link from "next/link";

/** Review scaffolding, same as the school side. Delete with the searchParams. */
export function TeacherSwitch({ view }: { view: string }) {
  const options = [
    { id: "daniel", label: "Daniel · mid-process", note: "offer open, passport expiring" },
    { id: "blocked", label: "Rebecca · blocked", note: "45% profile, nothing moving" },
    { id: "new", label: "First day", note: "account just created" },
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

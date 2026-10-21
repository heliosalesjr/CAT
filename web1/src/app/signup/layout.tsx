import "./signup.css";

// globals.css comes from the root layout; only the route-scoped sheet here,
// the same arrangement dashboard/layout.tsx uses.
export default function SignupLayout({ children }: LayoutProps<"/signup">) {
  return <div className="su wrap">{children}</div>;
}

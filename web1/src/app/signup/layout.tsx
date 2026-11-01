import { SessionBar } from "@/components/SessionBar";
import "./signup.css";

// globals.css comes from the root layout; only the route-scoped sheet here,
// the same arrangement dashboard/layout.tsx uses.
//
// The bar matters most here: signing up as somebody else starts on this page
// while the previous session is still live, and without it the form silently
// belongs to whoever was signed in last.
export default function SignupLayout({ children }: LayoutProps<"/signup">) {
  return (
    <div className="su wrap">
      <SessionBar />
      {children}
    </div>
  );
}

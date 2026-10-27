import "../signup/signup.css";

// Borrows the signup sheet rather than starting a third one: this side is a
// handful of forms and lists, and it should not grow its own design language
// before anybody has used it.
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <div className="su wrap">{children}</div>;
}

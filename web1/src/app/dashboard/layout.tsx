import "./dashboard.css";

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return <div className="dash">{children}</div>;
}

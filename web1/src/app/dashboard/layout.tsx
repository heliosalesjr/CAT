import { SessionBar } from "@/components/SessionBar";
import "./dashboard.css";

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <div className="dash">
      {/* `.dash` is full-bleed and every page brings its own `.dash-wrap`, so
          the bar borrows the global one to line up with the content under it. */}
      <div className="wrap">
        <SessionBar />
      </div>
      {children}
    </div>
  );
}

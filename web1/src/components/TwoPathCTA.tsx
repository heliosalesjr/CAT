import { Contours } from "./Contours";

export function TwoPathCTA() {
  return (
    <section className="wrap py-20 md:py-28">
      <div className="grid gap-px border border-[color:var(--color-rule)] bg-[color:var(--color-rule)] md:grid-cols-2">
        {/* Teacher path */}
        <div
          id="teachers"
          className="relative flex scroll-mt-24 flex-col overflow-hidden bg-[color:var(--color-paper)] p-10 md:p-14"
          style={{ minHeight: 360 }}
        >
          <Contours
            className="opacity-60"
            viewBox="120 400 480 360"
            strokeWidth={1}
            levels={[2, 5, 8]}
          />
          <div className="relative flex flex-1 flex-col">
            <span className="key key-gold self-start">For teachers</span>
            <h3 className="display-md mt-7 max-w-[12em]">
              Move abroad without moving alone.
            </h3>
            <p className="body mt-5 max-w-sm !text-[color:var(--color-navy-3)]">
              Free profile. Verified references. Applications that get answered.
              Premium boosts optional — never gatekeeping.
            </p>
            <div className="mt-auto flex flex-wrap gap-3 pt-10">
              <a href="#teacher-signup" className="btn btn-gold">
                Start your profile
              </a>
              <a href="#teacher-tour" className="btn btn-outline">
                See the tour
              </a>
            </div>
          </div>
        </div>

        {/* School path */}
        <div
          id="schools"
          className="relative flex scroll-mt-24 flex-col overflow-hidden p-10 md:p-14"
          style={
            {
              minHeight: 360,
              background: "var(--color-navy)",
              "--contour": "#27436a",
            } as React.CSSProperties
          }
        >
          <Contours
            className="opacity-80"
            viewBox="640 140 480 360"
            strokeWidth={1}
            levels={[3, 6, 9]}
          />
          <div className="relative flex flex-1 flex-col">
            <span
              className="key self-start"
              style={{
                background: "transparent",
                borderColor: "rgba(250,248,243,0.28)",
                color: "var(--color-paper)",
              }}
            >
              For schools
            </span>
            <h3
              className="display-md mt-7 max-w-[13em]"
              style={{ color: "var(--color-paper)" }}
            >
              Fill roles you actually want to hire for.
            </h3>
            <p
              className="body mt-5 max-w-sm"
              style={{ color: "rgba(250,248,243,0.68)" }}
            >
              Plans scale by student enrollment. RBAC, ATS, and explainable
              matching built in. No per-post gouging.
            </p>
            <div className="mt-auto flex flex-wrap gap-3 pt-10">
              <a href="#book-demo" className="btn btn-gold">
                Book a demo
              </a>
              <a
                href="#pricing"
                className="btn"
                style={{
                  border: "1px solid rgba(250,248,243,0.4)",
                  color: "var(--color-paper)",
                }}
              >
                See pricing
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

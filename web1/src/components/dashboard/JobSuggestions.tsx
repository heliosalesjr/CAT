import type { JobCard, CandidateSummary } from "@/lib/dashboard-data";

/**
 * Zones 5 and 6. Recommended roles always say why they are here; a bare match
 * percentage with nothing behind it is the thing the brief rules out. Saved
 * roles stay compact — he put them there, he knows what they are.
 */
export function JobSuggestions({
  recommended, saved, why, emptyReason,
}: {
  recommended: JobCard[];
  saved: JobCard[];
  why: CandidateSummary["recommendedJobs"];
  emptyReason: string | null;
}) {
  const reasonFor = (id: string) => why.find((w) => w.jobPostingId === id);

  return (
    <>
      <section className="dash-section" aria-labelledby="rec">
        <div className="dash-head">
          <h2 id="rec">Roles worth a look</h2>
          {recommended.length > 0 && <span className="readout">why each one is here</span>}
        </div>

        {recommended.length === 0 ? (
          <div className="rec-empty">
            <p>{emptyReason}</p>
            <button type="button" className="btn btn-accent">Finish your profile</button>
          </div>
        ) : (
          <div className="rec-grid">
            {recommended.map((j) => {
              const w = reasonFor(j.id);
              return (
                <article key={j.id} className="rec-card">
                  <h3>{j.title}</h3>
                  <span className="readout">{j.school} · {j.city}, {j.country}</span>
                  {w && (
                    <ul className="rec-why">
                      {w.whyShown.map((r) => <li key={r}>{r}</li>)}
                    </ul>
                  )}
                  <div className="rec-foot">
                    <span className="readout num">
                      {j.salaryMinUsd && `$${(j.salaryMinUsd / 1000).toFixed(0)}–${((j.salaryMaxUsd ?? 0) / 1000).toFixed(0)}k`}
                      {j.applyByDate && ` · apply by ${new Date(j.applyByDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`}
                    </span>
                    <button type="button" className="btn btn-quiet">View role</button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {saved.length > 0 && (
        <section className="dash-section" aria-labelledby="saved">
          <div className="dash-head"><h2 id="saved">Saved</h2></div>
          <ul className="saved-list panel panel-rows">
            {saved.map((j) => (
              <li key={j.id}>
                <span className="saved-title">{j.title}</span>
                <span className="readout">{j.school} · {j.city}</span>
                <button type="button" className="btn btn-quiet">Open</button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

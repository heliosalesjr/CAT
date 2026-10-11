import { formatIn, type InterviewRow } from "@/lib/dashboard-data";

/**
 * Zone 5. Both clocks on every row.
 *
 * The school's time is the one she acts on, so it leads. The candidate's time
 * sits beside it with the gap stated in words, because getting this wrong
 * costs someone a job and nobody should have to do the arithmetic. int_0002 is
 * a Doha candidate on a Seoul calendar: 23:00 UTC on the 14th is a civilised
 * 08:00 in Seoul and 02:00 in Doha.
 */
export function Interviews({ rows, schoolTimezone }: { rows: InterviewRow[]; schoolTimezone: string }) {
  if (!rows.length) {
    return (
      <section className="dash-section">
        <div className="dash-head"><h2>Upcoming interviews</h2></div>
        <p className="queue-clear">Nothing scheduled.</p>
      </section>
    );
  }

  return (
    <section className="dash-section" aria-labelledby="interviews">
      <div className="dash-head">
        <h2 id="interviews">Upcoming interviews</h2>
        <span className="readout">School time is {schoolTimezone.split("/")[1].replace("_", " ")}</span>
      </div>

      <div className="panel panel-rows">
        {rows.map((r) => {
          const at = new Date(r.startsAtUtc);
          const unsocial = isUnsocial(at, r.teacherTimezone);
          return (
            <article key={r.id} className="iv-row">
              <div className="iv-when">
                <span className="iv-date readout">
                  {formatIn(at, r.schoolTimezone, { weekday: "short", day: "numeric", month: "short" })}
                </span>
                <span className="fig iv-time">
                  {formatIn(at, r.schoolTimezone, { hour: "2-digit", minute: "2-digit", hour12: false })}
                </span>
                <span className="readout">your time</span>
              </div>

              <div className="iv-body">
                <h3>{r.who}</h3>
                <span className="iv-round readout">{r.round} · {r.durationMinutes} min</span>
                <span className="iv-their">
                  <strong className="num">
                    {formatIn(at, r.teacherTimezone, { hour: "2-digit", minute: "2-digit", hour12: false })}
                  </strong>{" "}
                  in {r.teacherCity} — {offsetWords(r.offsetHours)}
                  {unsocial && (
                    <span className="chip chip-caution iv-flag">
                      <span className="dot" style={{ background: "currentColor" }} />
                      {unsocial}
                    </span>
                  )}
                </span>
              </div>

              <span className={`chip ${r.status === "proposed" ? "chip-outline" : "chip-neutral"} iv-status`}>
                {r.status === "proposed" ? "Not confirmed" : `In ${r.daysAway}d`}
              </span>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function offsetWords(h: number) {
  if (h === 0) return "same clock";
  const n = Math.abs(h) % 1 === 0 ? Math.abs(h) : Math.abs(h).toFixed(1);
  return `${n}h ${h > 0 ? "ahead of" : "behind"} you`;
}

/** Flags a slot that lands outside waking hours for the candidate. */
function isUnsocial(at: Date, tz: string) {
  const hour = Number(formatIn(at, tz, { hour: "2-digit", hour12: false }));
  if (hour >= 22 || hour < 6) return "Night for them";
  if (hour < 8) return "Very early for them";
  return null;
}

import Link from "next/link";
import { getSchool, getShortlistsPage, getViewer } from "@/lib/dashboard-data";
import { ShortlistDetail } from "@/components/dashboard/ShortlistDetail";
import { PinMark } from "@/components/dashboard/Mark";

export const metadata = { title: "Shortlists — Class Act Talent" };
export const dynamic = "force-dynamic";

const SCHOOL_ID = "sch_hangang";

/**
 * Every shortlist, in full.
 *
 * The dashboard shows five per posting because it is a triage surface. This
 * page exists for the other mode: sitting down with one posting and working
 * through the whole list. The cards across the top are the postings; opening
 * one expands it below rather than navigating away, so comparing two postings
 * is a click rather than a round trip.
 */
export default async function ShortlistsPage({
  searchParams,
}: PageProps<"/dashboard/shortlists">) {
  const { posting, view = "hr" } = (await searchParams) as { posting?: string; view?: string };
  const viewer = getViewer(view === "coordinator" ? "usr_his_coord" : "usr_his_hr");
  const school = getSchool(SCHOOL_ID);
  const { summaries, selected, selectedId } = getShortlistsPage(SCHOOL_ID, posting);

  if (!summaries.length) {
    return (
      <main className="dash-wrap">
        <Head school={school.name} />
        <section className="dash-section">
          <p className="queue-clear">
            No posting has applications yet. Shortlists appear here as soon as
            somebody applies.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="dash-wrap">
      <Head school={school.name} />

      <section className="dash-section shortlist-zone sl-page">
        <div className="dash-head">
          <h2>Open postings</h2>
          <p>Pick one to work through its full list.</p>
        </div>

        <div className="slp-cards">
          {summaries.map((s) => {
            const on = s.posting.id === selectedId;
            return (
              <Link key={s.posting.id} href={`?posting=${s.posting.id}&view=${view}`}
                    className="slp-card" data-on={on || undefined}
                    aria-current={on ? "true" : undefined}>
                <span className="slp-card-title">{s.posting.title}</span>
                <span className="slp-card-n fig">{s.posting.applicationCount}</span>
                <span className="readout">
                  {s.rankableCount} ranked
                  {s.notRankableCount > 0 && ` · ${s.notRankableCount} not yet rankable`}
                </span>
                {!s.posting.aiRankingEnabled && (
                  <span className="chip chip-neutral">Ranking off</span>
                )}
                {s.posting.status === "on_hold" && (
                  <span className="chip chip-caution">
                    <span className="dot" style={{ background: "currentColor" }} />On hold
                  </span>
                )}
                {/* Stamps the card the detail below belongs to — the
                    brand's "here". */}
                {on && <PinMark className="slp-pin" size={26} weight={2.1} />}
              </Link>
            );
          })}
        </div>

        {selected && (
          <ShortlistDetail
            key={selectedId ?? "none"}
            data={selected}
            canEditCriteria={viewer.can("edit_ranking_criteria")}
            canSeeDocuments={viewer.can("view_documents")}
          />
        )}
      </section>
    </main>
  );
}

function Head({ school }: { school: string }) {
  return (
    <header className="slp-head">
      <Link href="/dashboard/school" className="readout pf-back">
        &larr; Back to the dashboard
      </Link>
      <h1>Shortlists</h1>
      <p>
        Every candidate for every open posting at {school}, in the order each
        posting asked for.
      </p>
    </header>
  );
}

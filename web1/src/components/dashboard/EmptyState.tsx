/**
 * The brand-new school. Shown to prospects, so it has to read as a product
 * waiting to start rather than a product that is broken: no chart skeletons,
 * no zeroed tiles, no dashes where numbers should be.
 */
export function EmptyState() {
  return (
    <section className="dash-section empty">
      <div className="empty-lead">
        {/* The school's name is already in the header above; repeating it here
            is the kind of filler that makes an empty state feel padded. */}
        <h1>Your first posting is the only thing missing.</h1>
        <p>
          Once a vacancy is live, this page becomes a triage queue: who is
          waiting on you, which posting is stalling, and who the ranking puts in
          front — with the reasoning shown, every time.
        </p>
        <div className="empty-actions">
          <button type="button" className="btn btn-accent">Post a vacancy</button>
          <button type="button" className="btn btn-quiet">Invite a colleague</button>
        </div>
      </div>

      <ol className="empty-steps panel panel-rows">
        {[
          { h: "Describe the role", p: "Subjects, division, curriculum, contract length and how certain the vacancy is." },
          { h: "Say what matters most", p: "Order three to five priorities. Candidates sort to match, and you can change your mind later." },
          { h: "Answer people", p: "Every applicant gets a reply. That is the part the rest of this industry skips." },
        ].map((s, i) => (
          <li key={s.h}>
            <span className="empty-step-n num">{i + 1}</span>
            <span><strong>{s.h}</strong><span>{s.p}</span></span>
          </li>
        ))}
      </ol>
    </section>
  );
}

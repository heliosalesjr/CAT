/**
 * A drawn placeholder, not a stock photograph.
 *
 * None of the 136 teacher records carries an avatarUrl, so there is no real
 * portrait to show. Rather than borrow a stranger's face to stand in for a
 * fictional candidate, this marks the slot a photo belongs in: initials over
 * the contour motif the brand already uses, square like everything else.
 *
 * Swap for <Image src={teacher.avatarUrl} /> the day the field is populated.
 */
export function Avatar({
  name, size = 72, missing = false,
}: { name: string; size?: number; missing?: boolean }) {
  /* An empty name means there is nobody to initial yet — a first-run account
     should not be stamped with the initials of a placeholder. */
  const initials = name.trim()
    ? name.split(" ").filter(Boolean).slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? "").join("")
    : "";

  return (
    <span className="avatar" style={{ width: size, height: size }}
          data-missing={missing || undefined}
          role="img" aria-label={missing ? `${name} — no photo yet` : name}>
      <svg viewBox="0 0 72 72" aria-hidden="true">
        <rect width="72" height="72" fill="var(--surface-sunken)" />
        <g fill="none" stroke="var(--border-control)" strokeWidth="1" opacity=".5">
          <ellipse cx="36" cy="44" rx="17" ry="11" />
          <ellipse cx="36" cy="44" rx="27" ry="18" />
          <ellipse cx="36" cy="44" rx="37" ry="25" />
        </g>
        <text x="36" y="36" textAnchor="middle" dominantBaseline="central"
              fontSize="24" fontWeight="700" fill="var(--ink)"
              style={{ fontFamily: "var(--font-googlesans), sans-serif",
                       fontVariationSettings: '"wght" 700, "GRAD" 120' }}>
          {initials}
        </text>
      </svg>
      {missing && <span className="avatar-flag readout">No photo</span>}
    </span>
  );
}

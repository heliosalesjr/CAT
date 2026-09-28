#!/usr/bin/env python3
"""
Bakes the site's contour sheets from terrain/field.json.

    npm run terrain

For each sheet it builds a scalar field (rotated gaussian peaks over a
regional tilt) from a seeded RNG, runs marching squares at N
elevations, stitches the resulting segments into continuous polylines,
smooths and simplifies them, and writes:

    src/components/terrain-data.ts   the path data (server only)
    src/components/terrain-meta.ts   small constants (client safe)

Deterministic: the same seed always produces the same sheets, so builds
are reproducible.
"""
import json
import math
import os
import random

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CFG = json.load(open(os.path.join(ROOT, "terrain", "field.json")))

W, H = CFG["box"]["width"], CFG["box"]["height"]
NX, NY = CFG["grid"]["nx"], CFG["grid"]["ny"]
LEVELS = CFG["levels"]
SHEETS = CFG["sheets"]
TILT = CFG["tilt"]
SM = CFG["smoothing"]
PR = CFG["peakRanges"]


def make_peaks(rng):
    """A constrained random terrain. The ranges are narrow enough that
    every draw reads as plausible relief rather than noise."""
    n = rng.randint(CFG["peakCount"]["min"], CFG["peakCount"]["max"])
    peaks = []
    for _ in range(n):
        sigma = rng.uniform(*PR["sigma"])
        aspect = rng.uniform(*PR["aspect"])
        wide = rng.random() < 0.5
        peaks.append((
            rng.uniform(*PR["cx"]),
            rng.uniform(*PR["cy"]),
            sigma if wide else sigma * aspect,
            sigma * aspect if wide else sigma,
            rng.uniform(*PR["rot"]),
            rng.uniform(*PR["amp"]),
        ))
    return peaks


def build_field(peaks):
    prepared = []
    for cx, cy, sx, sy, rot, amp in peaks:
        a = math.radians(rot)
        prepared.append((cx, cy, math.cos(a), math.sin(a),
                         2 * sx * sx, 2 * sy * sy, amp))

    def field(u, v):
        z = TILT["v"] * (1.0 - v) + TILT["u"] * u
        for cx, cy, ca, sa, dx, dy, amp in prepared:
            du, dv = u - cx, v - cy
            ru = du * ca - dv * sa
            rv = du * sa + dv * ca
            z += amp * math.exp(-((ru * ru) / dx + (rv * rv) / dy))
        return z

    return field


# Marching squares: which edges the isoline crosses, per corner mask.
# Edges are 0 top, 1 right, 2 bottom, 3 left.
TABLE = {
    1: [(3, 0)], 2: [(0, 1)], 3: [(3, 1)], 4: [(1, 2)],
    5: [(3, 2), (0, 1)], 6: [(0, 2)], 7: [(3, 2)],
    8: [(2, 3)], 9: [(2, 0)], 10: [(0, 3), (1, 2)], 11: [(2, 1)],
    12: [(1, 3)], 13: [(1, 0)], 14: [(0, 3)],
}


def isolines(grid, level):
    """Segments of one contour, as exact float coordinates."""
    segs = []
    sx = W / (NX - 1)
    sy = H / (NY - 1)
    for y in range(NY - 1):
        row0, row1 = grid[y], grid[y + 1]
        for x in range(NX - 1):
            v0, v1, v2, v3 = row0[x], row0[x + 1], row1[x + 1], row1[x]
            mask = ((1 if v0 > level else 0) | (2 if v1 > level else 0)
                    | (4 if v2 > level else 0) | (8 if v3 > level else 0))
            if mask == 0 or mask == 15:
                continue
            x0, y0 = x * sx, y * sy
            x1, y1 = x0 + sx, y0 + sy

            def lerp(a, b, va, vb):
                t = 0.5 if va == vb else (level - va) / (vb - va)
                return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)

            e = (
                lerp((x0, y0), (x1, y0), v0, v1),
                lerp((x1, y0), (x1, y1), v1, v2),
                lerp((x0, y1), (x1, y1), v3, v2),
                lerp((x0, y0), (x0, y1), v0, v3),
            )
            for a, b in TABLE[mask]:
                segs.append((e[a], e[b]))
    return segs


def stitch(segs):
    """Join segments end to end. Marching squares emits identical
    coordinates for a shared cell edge, so keys match exactly at a
    tolerance well below a pixel."""
    def key(p):
        return (round(p[0], 4), round(p[1], 4))

    adj = {}
    for a, b in segs:
        adj.setdefault(key(a), []).append((key(b), b))
        adj.setdefault(key(b), []).append((key(a), a))

    used = set()
    lines = []
    for a, b in segs:
        ka, kb = key(a), key(b)
        if (ka, kb) in used or (kb, ka) in used:
            continue
        used.add((ka, kb))
        line = [a, b]

        def walk(start, append):
            cur = start
            while True:
                nxt = None
                for k2, p2 in adj.get(cur, []):
                    if (cur, k2) not in used and (k2, cur) not in used:
                        nxt = (k2, p2)
                        break
                if not nxt:
                    return cur
                used.add((cur, nxt[0]))
                append(nxt[1])
                cur = nxt[0]

        end = walk(kb, line.append)
        start = walk(ka, lambda p: line.insert(0, p))
        # A ring: the walk came back to where it started.
        closed = end == key(line[0]) or start == key(line[-1])
        lines.append((line, closed))
    return lines


def chaikin(pts, closed, iterations):
    """Corner cutting. Each pass replaces every vertex with two points a
    quarter in from its neighbours, which is what turns the grid's
    8-pixel staircase into a curve."""
    for _ in range(iterations):
        out = []
        n = len(pts)
        if closed:
            for i in range(n):
                p, q = pts[i], pts[(i + 1) % n]
                out.append((0.75 * p[0] + 0.25 * q[0], 0.75 * p[1] + 0.25 * q[1]))
                out.append((0.25 * p[0] + 0.75 * q[0], 0.25 * p[1] + 0.75 * q[1]))
        else:
            out.append(pts[0])
            for i in range(n - 1):
                p, q = pts[i], pts[i + 1]
                out.append((0.75 * p[0] + 0.25 * q[0], 0.75 * p[1] + 0.25 * q[1]))
                out.append((0.25 * p[0] + 0.75 * q[0], 0.25 * p[1] + 0.75 * q[1]))
            out.append(pts[-1])
        pts = out
    return pts


def simplify(pts, eps):
    """Douglas-Peucker, iteratively. Smoothing quadruples the point
    count; this hands most of it back without touching the shape."""
    if len(pts) < 3:
        return pts
    keep = [False] * len(pts)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        lo, hi = stack.pop()
        if hi <= lo + 1:
            continue
        ax, ay = pts[lo]
        bx, by = pts[hi]
        dx, dy = bx - ax, by - ay
        norm = math.hypot(dx, dy) or 1e-9
        worst, wi = 0.0, -1
        for i in range(lo + 1, hi):
            px, py = pts[i]
            d = abs(dy * px - dx * py + bx * ay - by * ax) / norm
            if d > worst:
                worst, wi = d, i
        if worst > eps and wi > 0:
            keep[wi] = True
            stack.append((lo, wi))
            stack.append((wi, hi))
    return [p for p, k in zip(pts, keep) if k]


def to_path(pts, closed):
    head = "M%.1f %.1f" % pts[0]
    body = "L" + " ".join("%.1f %.1f" % p for p in pts[1:])
    return head + body + ("Z" if closed else "")


def build_sheet(rng):
    field = build_field(make_peaks(rng))
    grid = [[field(x / (NX - 1), y / (NY - 1)) for x in range(NX)]
            for y in range(NY)]
    lo = min(min(r) for r in grid)
    hi = max(max(r) for r in grid)

    sheet = []
    for li in range(1, LEVELS + 1):
        level = lo + (hi - lo) * li / (LEVELS + 1)
        paths = []
        for line, closed in stitch(isolines(grid, level)):
            if len(line) < SM["minPoints"]:
                continue
            pts = chaikin(line, closed, SM["chaikin"])
            pts = simplify(pts, SM["simplifyEpsilon"])
            if len(pts) < 4:
                continue
            paths.append(to_path(pts, closed))
        sheet.append("".join(paths))
    return sheet


rng = random.Random(CFG["seed"])
sheets = [build_sheet(rng) for _ in range(SHEETS)]

meta = os.path.join(ROOT, "src", "components", "terrain-meta.ts")
with open(meta, "w") as fh:
    fh.write('''/**
 * Terrain constants. GENERATED — do not edit; run `npm run terrain`.
 *
 * Kept apart from terrain-data.ts so client components can import it:
 * the path data must never leave the server bundle.
 */
export const CONTOUR_BOX = { width: %d, height: %d } as const;
export const LEVELS = %d;
export const SHEET_COUNT = %d;
''' % (W, H, LEVELS, SHEETS))

out = os.path.join(ROOT, "src", "components", "terrain-data.ts")
body = ",\n".join(
    "  [\n" + ",\n".join('    "%s"' % p for p in sheet) + "\n  ]"
    for sheet in sheets
)
with open(out, "w") as fh:
    fh.write('''/**
 * Contour sheets. GENERATED — do not edit; run `npm run terrain`.
 *
 * %d sheets of %d elevations each, produced by marching squares over a
 * seeded scalar field. They are real isolines, so they nest and never
 * cross — the thing your eye checks without knowing it is checking.
 * Rings close with Z; open lines run to the sheet edge.
 *
 * Coordinate space is %d x %d. Server-only: importing this from a
 * client component would ship every sheet to the browser.
 */
export const SHEETS: readonly (readonly string[])[] = [
%s,
];
''' % (SHEETS, LEVELS, W, H, body))

total = sum(len(p) for s in sheets for p in s)
print("wrote %d sheets x %d levels — %.1f KB total, %.1f KB per sheet"
      % (SHEETS, LEVELS, total / 1024, total / 1024 / SHEETS))

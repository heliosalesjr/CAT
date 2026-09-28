/**
 * Terrain constants. GENERATED — do not edit; run `npm run terrain`.
 *
 * Kept apart from terrain-data.ts so client components can import it:
 * the path data must never leave the server bundle.
 */
export const CONTOUR_BOX = { width: 1200, height: 800 } as const;
export const LEVELS = 13;
export const SHEET_COUNT = 6;

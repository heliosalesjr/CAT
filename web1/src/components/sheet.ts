import { cache } from "react";
import { SHEET_COUNT } from "./terrain-meta";

/**
 * Which contour sheet this request draws.
 *
 * cache() makes the pick stable across one render, so every section on
 * the page shows a crop of the *same* terrain — the whole conceit is
 * one place seen at different scales. A new request draws a new sheet,
 * which is why the page opts out of static rendering.
 *
 * To freeze it instead, return a constant here and drop the
 * `export const dynamic` in app/page.tsx.
 */
export const currentSheet = cache(() =>
  Math.floor(Math.random() * SHEET_COUNT),
);
